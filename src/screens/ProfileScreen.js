import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import statsService from '../services/statsService';
import permissionsService from '../services/permissionsService';
import colors from '../theme/colors';

export default function ProfileScreen() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [permissions, setPermissions] = useState({
    location: false,
    backgroundLocation: false,
    notifications: false,
  });
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
      checkPermissions();
    }, [user])
  );

  const loadStats = async () => {
    if (!user) return;
    
    setLoadingStats(true);
    try {
      const globalStats = await statsService.getGlobalStats(user.id);
      setStats(globalStats);
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const perms = await permissionsService.checkAllPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
    }
  };

  // gérer le toggle de la permission de localisation
  const handleLocationToggle = async (value) => {
    if (value) {
      setLoadingPermissions(true);
      const granted = await permissionsService.requestLocationPermission();
      setLoadingPermissions(false);
      
      if (granted) {
        setPermissions(prev => ({ ...prev, location: true }));
      } else {
        Alert.alert(
          'Permission refusée',
          'La permission de localisation est nécessaire pour enregistrer vos parcours. Vous pouvez l\'activer dans les paramètres.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => permissionsService.openAppSettings() }
          ]
        );
      }
    } else {
      Alert.alert(
        'Désactiver la localisation',
        'Pour désactiver cette permission, rendez-vous dans les paramètres de votre appareil.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Ouvrir paramètres', onPress: () => permissionsService.openAppSettings() }
        ]
      );
    }
  };

  // gérer le toggle de la localisation en arrière-plan
  const handleBackgroundLocationToggle = async (value) => {
    if (value) {
      setLoadingPermissions(true);
      const granted = await permissionsService.requestBackgroundLocationPermission();
      setLoadingPermissions(false);
      
      if (granted) {
        setPermissions(prev => ({ ...prev, backgroundLocation: true }));
      } else {
        Alert.alert(
          'Permission refusée',
          'La permission de localisation en arrière-plan permet de continuer l\'enregistrement même lorsque l\'écran est éteint.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => permissionsService.openAppSettings() }
          ]
        );
      }
    } else {
      Alert.alert(
        'Désactiver la localisation en arrière-plan',
        'Pour désactiver cette permission, rendez-vous dans les paramètres de votre appareil.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Ouvrir paramètres', onPress: () => permissionsService.openAppSettings() }
        ]
      );
    }
  };

  // gérer le toggle des notifications
  const handleNotificationsToggle = async (value) => {
    if (value) {
      setLoadingPermissions(true);
      const granted = await permissionsService.requestNotificationPermission();
      setLoadingPermissions(false);
      
      if (granted) {
        setPermissions(prev => ({ ...prev, notifications: true }));
      } else {
        Alert.alert(
          'Permission refusée',
          'Les notifications vous permettent de rester informé de vos activités.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => permissionsService.openAppSettings() }
          ]
        );
      }
    } else {
      Alert.alert(
        'Désactiver les notifications',
        'Pour désactiver les notifications, rendez-vous dans les paramètres de votre appareil.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Ouvrir paramètres', onPress: () => permissionsService.openAppSettings() }
        ]
      );
    }
  };

  // mettre à jour les valeurs locales quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Erreur', 'L\'email ne peut pas être vide');
      return;
    }

    const updates = {};
    if (name.trim() !== user.name) {
      updates.name = name.trim();
    }
    if (email.trim() !== user.email) {
      updates.email = email.trim();
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }

    const result = await updateProfile(updates);
    
    if (result.success) {
      setIsEditing(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } else {
      Alert.alert('Erreur', result.error);
      setName(user?.name || '');
      setEmail(user?.email || '');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);
    
    if (result.success) {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
    } else {
      Alert.alert('Erreur', result.error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleCancelEdit = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={50} color="#fff" />
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>📊 Statistiques Globales</Text>
        
        {loadingStats ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : stats ? (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="barbell-outline" size={32} color={colors.primary} />
                <Text style={styles.statValue}>{stats.totalActivities}</Text>
                <Text style={styles.statLabel}>Activités</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="map-outline" size={32} color={colors.primary} />
                <Text style={styles.statValue}>{stats.totalDistanceKm}</Text>
                <Text style={styles.statLabel}>km parcourus</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={32} color={colors.primary} />
                <Text style={styles.statValue}>{stats.totalDurationFormatted}</Text>
                <Text style={styles.statLabel}>Temps total</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="speedometer-outline" size={32} color={colors.primary} />
                <Text style={styles.statValue}>{stats.avgSpeed}</Text>
                <Text style={styles.statLabel}>km/h moy.</Text>
              </View>
            </View>

            {stats.longestDistance > 0 && (
              <View style={styles.recordsContainer}>
                <Text style={styles.recordsTitle}>🏆 Records Personnels</Text>
                <View style={styles.recordRow}>
                  <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                  <Text style={styles.recordText}>Plus longue distance: {stats.longestDistance} km</Text>
                </View>
                <View style={styles.recordRow}>
                  <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                  <Text style={styles.recordText}>Plus longue durée: {stats.longestDuration}</Text>
                </View>
              </View>
            )}

            {stats.totalActivities > 0 && (
              <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownTitle}>Répartition des activités</Text>
                {stats.activityBreakdown.run > 0 && (
                  <View style={styles.breakdownRow}>
                    <Ionicons name="walk-outline" size={20} color={colors.primary} />
                    <Text style={styles.breakdownText}>Course: {stats.activityBreakdown.run}</Text>
                  </View>
                )}
                {stats.activityBreakdown.bike > 0 && (
                  <View style={styles.breakdownRow}>
                    <Ionicons name="bicycle-outline" size={20} color={colors.primary} />
                    <Text style={styles.breakdownText}>Vélo: {stats.activityBreakdown.bike}</Text>
                  </View>
                )}
                {stats.activityBreakdown.walk > 0 && (
                  <View style={styles.breakdownRow}>
                    <Ionicons name="footsteps-outline" size={20} color={colors.primary} />
                    <Text style={styles.breakdownText}>Marche: {stats.activityBreakdown.walk}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.noStatsContainer}>
            <Ionicons name="analytics-outline" size={60} color={colors.textLighter} />
            <Text style={styles.noStatsText}>Aucune activité enregistrée</Text>
            <Text style={styles.noStatsSubText}>Commencez à enregistrer vos activités pour voir vos statistiques !</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Informations personnelles</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nom</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Votre nom"
            />
          ) : (
            <Text style={styles.value}>{user?.name}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Votre email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.value}>{user?.email}</Text>
          )}
        </View>

        {isEditing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleCancelEdit}
            >
              <Text style={styles.buttonSecondaryText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSaveProfile}
            >
              <Text style={styles.buttonPrimaryText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.buttonPrimaryText}>Modifier le profil</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Sécurité</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setShowPasswordModal(true)}
        >
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          <Text style={styles.buttonSecondaryText}>Changer le mot de passe</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Permissions</Text>
        <Text style={styles.sectionDescription}>
          Gérez les autorisations accordées à l'application
        </Text>

        <View style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <View style={styles.permissionHeader}>
              <Ionicons name="location" size={24} color={colors.primary} />
              <Text style={styles.permissionTitle}>Localisation</Text>
            </View>
            <Text style={styles.permissionDescription}>
              Nécessaire pour enregistrer vos parcours GPS et afficher votre position sur la carte
            </Text>
          </View>
          <Switch
            value={permissions.location}
            onValueChange={handleLocationToggle}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={permissions.location ? colors.primary : colors.textLighter}
            disabled={loadingPermissions}
          />
        </View>

        <View style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <View style={styles.permissionHeader}>
              <Ionicons name="navigate" size={24} color={colors.primary} />
              <Text style={styles.permissionTitle}>Localisation en arrière-plan</Text>
            </View>
            <Text style={styles.permissionDescription}>
              Permet de continuer l'enregistrement même lorsque l'écran est éteint ou l'app en arrière-plan
            </Text>
          </View>
          <Switch
            value={permissions.backgroundLocation}
            onValueChange={handleBackgroundLocationToggle}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={permissions.backgroundLocation ? colors.primary : colors.textLighter}
            disabled={loadingPermissions || !permissions.location}
          />
        </View>

        <View style={styles.permissionItem}>
          <View style={styles.permissionInfo}>
            <View style={styles.permissionHeader}>
              <Ionicons name="notifications" size={24} color={colors.primary} />
              <Text style={styles.permissionTitle}>Notifications</Text>
            </View>
            <Text style={styles.permissionDescription}>
              Recevez des alertes lors du démarrage/arrêt d'activités et des rappels pour rester actif
            </Text>
          </View>
          <Switch
            value={permissions.notifications}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={permissions.notifications ? colors.primary : colors.textLighter}
            disabled={loadingPermissions}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, { marginTop: 15 }]}
          onPress={() => permissionsService.openAppSettings()}
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
          <Text style={styles.buttonSecondaryText}>Ouvrir les paramètres système</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Compte</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.buttonDangerText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le mot de passe</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, styles.modalButton]}
              onPress={handleChangePassword}
            >
              <Text style={styles.buttonPrimaryText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textWhite,
    marginBottom: 5,
  },
  email: {
    fontSize: 15,
    color: colors.textWhite,
    opacity: 0.9,
  },
  statsSection: {
    backgroundColor: colors.cardBackground,
    marginTop: 20,
    padding: 20,
    marginHorizontal: 10,
    borderRadius: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.primaryOverlay,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 30,
  },
  noStatsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noStatsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: 15,
  },
  noStatsSubText: {
    fontSize: 14,
    color: colors.textLighter,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recordsContainer: {
    backgroundColor: colors.backgroundGray,
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  recordsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  recordText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 10,
  },
  breakdownContainer: {
    backgroundColor: colors.backgroundGray,
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  breakdownText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 10,
  },
  section: {
    backgroundColor: colors.cardBackground,
    marginTop: 20,
    padding: 20,
    marginHorizontal: 10,
    borderRadius: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 15,
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 15,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 10,
  },
  permissionDescription: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 18,
    marginLeft: 34,
  },
  infoRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 5,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  buttonPrimaryText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    flex: 1,
  },
  buttonSecondaryText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonDangerText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalInput: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButton: {
    marginTop: 10,
  },
});