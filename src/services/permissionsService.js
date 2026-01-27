import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';

/**
 * Service de gestion des permissions Android
 */
class PermissionsService {
  /**
   * Vérifie si la permission de localisation est accordée
   */
  async checkLocationPermission() {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted;
    } catch (error) {
      console.error('Erreur vérification permission localisation:', error);
      return false;
    }
  }

  /**
   * Demande la permission de localisation
   */
  async requestLocationPermission() {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permission de localisation',
          message: 'Strive a besoin d\'accéder à votre position pour enregistrer vos parcours',
          buttonPositive: 'Autoriser',
          buttonNegative: 'Refuser',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Erreur demande permission localisation:', error);
      return false;
    }
  }

  /**
   * Vérifie la permission de localisation en arrière-plan (Android 10+)
   */
  async checkBackgroundLocationPermission() {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 10 (API 29) et supérieur
      if (Platform.Version >= 29) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
        return granted;
      }
      // Pour les versions antérieures, la permission foreground inclut le background
      return await this.checkLocationPermission();
    } catch (error) {
      console.error('Erreur vérification permission background:', error);
      return false;
    }
  }

  /**
   * Demande la permission de localisation en arrière-plan
   */
  async requestBackgroundLocationPermission() {
    if (Platform.OS !== 'android') return true;

    const hasForeground = await this.checkLocationPermission();
    if (!hasForeground) {
      Alert.alert(
        'Permission requise',
        'Veuillez d\'abord autoriser l\'accès à la localisation',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      if (Platform.Version >= 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Localisation en arrière-plan',
            message: 'Strive doit accéder à votre position même lorsque l\'application est en arrière-plan pour continuer l\'enregistrement de votre parcours',
            buttonPositive: 'Autoriser',
            buttonNegative: 'Refuser',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      console.error('Erreur demande permission background:', error);
      return false;
    }
  }

  /**
   * Vérifie la permission des notifications (Android 13+)
   */
  async checkNotificationPermission() {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 13 (API 33) et supérieur
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return granted;
      }
      // Pour les versions antérieures, les notifications sont activées par défaut
      return true;
    } catch (error) {
      console.error('Erreur vérification permission notifications:', error);
      return false;
    }
  }

  /**
   * Demande la permission des notifications
   */
  async requestNotificationPermission() {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Permission de notifications',
            message: 'Strive vous enverra des notifications pour vous tenir informé de vos activités',
            buttonPositive: 'Autoriser',
            buttonNegative: 'Refuser',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      console.error('Erreur demande permission notifications:', error);
      return false;
    }
  }

  /**
   * Ouvre les paramètres de l'application
   */
  openAppSettings() {
    Linking.openSettings();
  }

  /**
   * Vérifie toutes les permissions
   */
  async checkAllPermissions() {
    const location = await this.checkLocationPermission();
    const backgroundLocation = await this.checkBackgroundLocationPermission();
    const notifications = await this.checkNotificationPermission();

    return {
      location,
      backgroundLocation,
      notifications,
    };
  }
}

export default new PermissionsService();
