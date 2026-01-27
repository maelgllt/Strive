import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadActivities = async () => {
    setRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem('activities');
      if (stored) {
        const allActivities = JSON.parse(stored);
        const userActivities = allActivities.filter(act => act.userId === user?.id);
        setActivities(userActivities);
      }
    } catch (e) {
      console.error("Erreur de chargement", e);
    }
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [])
  );

  const deleteActivity = (id) => {
    Alert.alert(
      "Supprimer l'activité",
      "Voulez-vous vraiment supprimer cette activité de votre historique ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem('activities');
              const allActivities = stored ? JSON.parse(stored) : [];
              const updatedActivities = allActivities.filter(item => item.id !== id);
              await AsyncStorage.setItem('activities', JSON.stringify(updatedActivities));
              setActivities(activities.filter(item => item.id !== id));
            } catch (e) {
              console.error("Erreur suppression", e);
            }
          }
        }
      ]
    );
  };

  const getSportIcon = (type) => {
    switch(type) {
        case 'bike': return 'bicycle-outline';
        case 'walk': return 'footsteps-outline';
        case 'run': 
        default: return 'walk-outline';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    const type = activity.sportType || 'run'; 
    return type === filter;
  });

  const renderItem = ({ item }) => {
    const dateObj = new Date(item.date);
    const dateStr = dateObj.toLocaleDateString('fr-FR');
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', minute: '2-digit', hour12: false 
    });

    const formatDuration = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        return `${m}:${s.toString().padStart(2,'0')}`;
    };

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('Detail', { activity: item })}
        onLongPress={() => deleteActivity(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <View style={styles.iconBg}>
                <Ionicons name={getSportIcon(item.sportType)} size={20} color="#FC4C02" />
             </View>
             <View>
                <Text style={styles.activityName}>{item.name || "Sortie sans nom"}</Text>
                <Text style={styles.dateTitle}>{dateStr} à {timeStr}</Text>
             </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.label}>DISTANCE</Text>
            <Text style={styles.value}>{(item.distance / 1000).toFixed(2)} km</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>DURÉE</Text>
            <Text style={styles.value}>{formatDuration(item.duration)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.label}>VITESSE</Text>
            <Text style={styles.value}>{item.avgSpeed ? Number(item.avgSpeed).toFixed(1) : '0'} km/h</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterChip = ({ label, value, icon }) => (
    <TouchableOpacity 
        style={[styles.chip, filter === value && styles.chipActive]} 
        onPress={() => setFilter(value)}
    >
        {icon && <Ionicons name={icon} size={16} color={filter === value ? 'white' : '#555'} style={{marginRight: 5}} />}
        <Text style={[styles.chipText, filter === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>Mon Historique</Text>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterChip label="Tous" value="all" />
            <FilterChip label="Course" value="run" icon="walk-outline" />
            <FilterChip label="Vélo" value="bike" icon="bicycle-outline" />
            <FilterChip label="Marche" value="walk" icon="footsteps-outline" />
        </ScrollView>
      </View>

      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune activité trouvée.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadActivities} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20, paddingTop: 50 },
  mainTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  
  filterContainer: { flexDirection: 'row', marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  chipActive: { backgroundColor: '#FC4C02' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#555' },
  chipTextActive: { color: 'white' },

  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  iconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0E6', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  dateTitle: { fontSize: 12, color: '#888' },
  activityName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  label: { fontSize: 10, color: '#888', marginBottom: 2 },
  value: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#AAA', fontSize: 16 }
});