import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

/**
 * Service de gestion des statistiques utilisateur
 */
class StatsService {
  /**
   * Récupère toutes les activités d'un utilisateur
   */
  async getUserActivities(userId) {
    try {
      const activitiesJson = await AsyncStorage.getItem('activities');
      const allActivities = activitiesJson ? JSON.parse(activitiesJson) : [];
      
      return allActivities;
    } catch (error) {
      console.error('Erreur lors de la récupération des activités:', error);
      return [];
    }
  }

  /**
   * Calcule les statistiques globales d'un utilisateur
   */
  async getGlobalStats(userId) {
    try {
      const activities = await this.getUserActivities(userId);
      
      if (activities.length === 0) {
        return {
          totalActivities: 0,
          totalDistance: 0,
          totalDuration: 0,
          avgSpeed: 0,
          totalDistanceKm: 0,
          totalDurationFormatted: '0h 0min',
          longestDistance: 0,
          longestDuration: 0,
          activityBreakdown: {
            run: 0,
            bike: 0,
            walk: 0,
          },
        };
      }

      // Calculs
      const totalDistance = activities.reduce((sum, act) => sum + (act.distance || 0), 0);
      const totalDuration = activities.reduce((sum, act) => sum + (act.duration || 0), 0);
      const totalActivities = activities.length;
      
      // Distance moyenne
      const avgSpeed = totalDuration > 0 
        ? (totalDistance / 1000) / (totalDuration / 3600) 
        : 0;

      // Plus longue distance et durée
      const longestDistance = Math.max(...activities.map(act => act.distance || 0));
      const longestDuration = Math.max(...activities.map(act => act.duration || 0));

      // Répartition par type d'activité
      const activityBreakdown = activities.reduce((acc, act) => {
        const type = act.sportType || 'run';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, { run: 0, bike: 0, walk: 0 });

      // Formatage
      const totalDistanceKm = (totalDistance / 1000).toFixed(2);
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);
      const totalDurationFormatted = `${hours}h ${minutes}min`;

      return {
        totalActivities,
        totalDistance,
        totalDuration,
        avgSpeed: avgSpeed.toFixed(2),
        totalDistanceKm,
        totalDurationFormatted,
        longestDistance: (longestDistance / 1000).toFixed(2),
        longestDuration: this.formatDuration(longestDuration),
        activityBreakdown,
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return null;
    }
  }

  /**
   * Formatte une durée en secondes en format lisible
   */
  formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) {
      return `${h}h ${m}min`;
    }
    if (m > 0) {
      return `${m}min ${s}s`;
    }
    return `${s}s`;
  }

  /**
   * Obtient les statistiques du mois en cours
   */
  async getMonthlyStats(userId) {
    try {
      const activities = await this.getUserActivities(userId);
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthActivities = activities.filter(act => {
        const actDate = new Date(act.date);
        return actDate.getMonth() === currentMonth && actDate.getFullYear() === currentYear;
      });

      const totalDistance = monthActivities.reduce((sum, act) => sum + (act.distance || 0), 0);
      const totalDuration = monthActivities.reduce((sum, act) => sum + (act.duration || 0), 0);

      return {
        count: monthActivities.length,
        distance: (totalDistance / 1000).toFixed(2),
        duration: this.formatDuration(totalDuration),
      };
    } catch (error) {
      console.error('Erreur lors du calcul des stats mensuelles:', error);
      return { count: 0, distance: '0', duration: '0min' };
    }
  }

  /**
   * Obtient les statistiques de la semaine en cours
   */
  async getWeeklyStats(userId) {
    try {
      const activities = await this.getUserActivities(userId);
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weekActivities = activities.filter(act => {
        const actDate = new Date(act.date);
        return actDate >= oneWeekAgo;
      });

      const totalDistance = weekActivities.reduce((sum, act) => sum + (act.distance || 0), 0);
      const totalDuration = weekActivities.reduce((sum, act) => sum + (act.duration || 0), 0);

      return {
        count: weekActivities.length,
        distance: (totalDistance / 1000).toFixed(2),
        duration: this.formatDuration(totalDuration),
      };
    } catch (error) {
      console.error('Erreur lors du calcul des stats hebdomadaires:', error);
      return { count: 0, distance: '0', duration: '0min' };
    }
  }
}

export default new StatsService();
