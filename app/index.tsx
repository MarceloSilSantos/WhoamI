import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';  // Inicializa o TensorFlow no ambiente Expo
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as FileSystem from 'expo-file-system';  // Para manipulação de arquivos
import { SplashScreen } from 'expo';  // Evitar o fechamento da tela de splash

export default function index() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [model, setModel] = useState(null);
  const [objectName, setObjectName] = useState('');

  useEffect(() => {
    (async () => {
      // Solicitar permissão para a câmera
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      // Carregar o modelo TensorFlow
      await tf.ready();
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);

      // Impedir que a tela de splash seja fechada
      SplashScreen.preventAutoHideAsync();
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync();
      setPhotoUri(photo.uri);
      analyzeImage(photo.uri);
    }
  };

  const analyzeImage = async (uri) => {
    if (model && uri) {
      // Carregar a imagem como base64
      const image = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const imageTensor = await tf.browser.fromPixels(image);  // Converte para tensor

      // Detectar objetos na imagem
      const predictions = await model.detect(imageTensor);

      if (predictions.length > 0) {
        setObjectName(predictions[0].class);  // Exibir o nome do primeiro objeto detectado
      } else {
        setObjectName('No object detected');
      }
    }
  };

  if (hasPermission === null) {
    return <Text>Loading...</Text>;
  }

  if (hasPermission === false) {
    return <Text>Access not Allowed!</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={Camera.Constants.Type.back} ref={(ref) => setCameraRef(ref)}>
        <View style={styles.cameraOverlay}>
          <Button title="Take a Picture!" onPress={takePicture} />
        </View>
      </Camera>

      {photoUri && (
        <View style={styles.result}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          <Text style={styles.objectText}>{objectName}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  result: {
    alignItems: 'center',
    marginTop: 20,
  },
  photo: {
    width: 300,
    height: 300,
    borderRadius: 15,
  },
  objectText: {
    marginTop: 10,
    fontSize: 20,
    color: 'white',
  },
});
