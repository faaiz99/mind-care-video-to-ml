import React, { useRef, useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { View, Button, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
const App = () => {
  const webViewRef = useRef<WebView | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const postImage = async () => {
    const apiUrlTest = 'http://192.168.100.19:8000/process_image/';
  
    try {
      // GET request
      const getResponse = await axios.get('http://192.168.100.19:8000/test');
      console.log(getResponse.data.test);
  
      // POST request
      let formData = new FormData();
      formData.append('files', { uri: capturedImage, name: 'image.jpg', type: 'image/jpeg' });
      const postResponse = await axios.post(apiUrlTest, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log(postResponse.data);
    } catch (error) {
      console.error(error);
    }
  };

  const getVideoScreenshot = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
      (function() {
        window.ReactNativeWebView.postMessage('Injected JavaScript started');
        try {
          const video = document.querySelector('video');
          if (!video) {
            window.ReactNativeWebView.postMessage('No video element found');
            return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
          window.ReactNativeWebView.postMessage(dataUrl);
        } catch (error) {
          window.ReactNativeWebView.postMessage('Error: ' + error.message);
        }
        window.ReactNativeWebView.postMessage('Injected JavaScript finished');
      })();
    `);

    }
  };
  useEffect(() => {
    if (webViewLoaded) {
      const interval = setInterval(() => {
        getVideoScreenshot();
        postImage();
      }, 5000); 

      return () => clearInterval(interval);
    }
  }, [webViewLoaded]);
  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        javaScriptEnabled={true}
        onLoad={() => setWebViewLoaded(true)}
        source={{ uri: 'https://mindcare.daily.co/mindcare' }}
        onMessage={async (event) => {
          if (event.nativeEvent.data.startsWith('Error:')) {
            console.error(event.nativeEvent.data);
          } else if (event.nativeEvent.data.startsWith('No video element found')) {
            console.warn(event.nativeEvent.data);
          } else if (event.nativeEvent.data.startsWith('data:image/jpeg;base64')) {
            const base64Data = event.nativeEvent.data.split(',')[1];
            const filename = `${FileSystem.documentDirectory}${Date.now()}.jpg`;
            await FileSystem.writeAsStringAsync(filename, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            setCapturedImage(filename);
            console.log(filename);
          }
        }}
        style={{ flex: 1, height: 20 }}
      />
      <Button title="Get Video Screenshot" onPress={async () => {
        getVideoScreenshot();
        postImage(capturedImage as string);
      }} disabled={!webViewLoaded} />
      {capturedImage && (
        <Image
          source={{ uri: capturedImage }}
          style={{ width: 200, height: 200, marginVertical: 20 }}
        />
      )}
    </View>
  );
};

export default App;
