import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const USERS_KEY = '@strive_users';
const SESSION_KEY = '@strive_session';

/**
 * Service d'authentification - gère l'inscription, la connexion et la persistance de session
 */
class AuthService {
  /**
   * Hash un mot de passe avec SHA256
   */
  hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
  }

  /**
   * Vérifie si un mot de passe est déjà hashé (longueur 64 caractères pour SHA256)
   */
  isPasswordHashed(password) {
    return password && password.length === 64 && /^[a-f0-9]+$/.test(password);
  }

  /**
   * Migration des anciens mots de passe en clair vers des mots de passe hashés
   */
  async migratePasswords() {
    try {
      const users = await this.getUsers();
      let migrated = false;

      const updatedUsers = users.map(user => {
        if (!this.isPasswordHashed(user.password)) {
          migrated = true;
          return {
            ...user,
            password: this.hashPassword(user.password),
            updatedAt: new Date().toISOString(),
          };
        }
        return user;
      });

      if (migrated) {
        await this.saveUsers(updatedUsers);
        console.log('Migration des mots de passe effectuée avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de la migration des mots de passe:', error);
    }
  }
  /**
   * Récupère tous les utilisateurs stockés
   */
  async getUsers() {
    try {
      const usersJson = await AsyncStorage.getItem(USERS_KEY);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  }

  /**
   * Sauvegarde la liste des utilisateurs
   */
  async saveUsers(users) {
    try {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des utilisateurs:', error);
      throw error;
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(name, email, password) {
    if (!name || !email || !password) {
      throw new Error('Tous les champs sont requis');
    }

    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Adresse email invalide');
    }

    const users = await this.getUsers();
    
    // Vérifier si l'email existe déjà
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      throw new Error('Cet email est déjà utilisé');
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password: this.hashPassword(password), // Mot de passe hashé
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await this.saveUsers(users);

    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    const users = await this.getUsers();
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === this.hashPassword(password)
    );

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    await this.saveSession(user);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Déconnexion
   */
  async logout() {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  }

  /**
   * Sauvegarder la session
   */
  async saveSession(user) {
    try {
      const { password: _, ...userWithoutPassword } = user;
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userWithoutPassword));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session:', error);
      throw error;
    }
  }

  /**
   * Récupérer la session active
   */
  async getSession() {
    try {
      const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
      return sessionJson ? JSON.parse(sessionJson) : null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      return null;
    }
  }

  /**
   * Mettre à jour les informations de l'utilisateur
   */
  async updateUser(userId, updates) {
    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('Utilisateur non trouvé');
    }

    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        throw new Error('Adresse email invalide');
      }

      // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
      const existingUser = users.find(
        u => u.email.toLowerCase() === updates.email.toLowerCase() && u.id !== userId
      );
      if (existingUser) {
        throw new Error('Cet email est déjà utilisé par un autre compte');
      }

      updates.email = updates.email.toLowerCase();
    }

    const { id: _, ...allowedUpdates } = updates;

    users[userIndex] = {
      ...users[userIndex],
      ...allowedUpdates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveUsers(users);

    const { password, ...userWithoutPassword } = users[userIndex];
    await this.saveSession(users[userIndex]);

    return userWithoutPassword;
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(userId, currentPassword, newPassword) {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    if (user.password !== this.hashPassword(currentPassword)) {
      throw new Error('Mot de passe actuel incorrect');
    }

    if (newPassword.length < 6) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
    }

    user.password = this.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    await this.saveUsers(users);

    return true;
  }

  /**
   * Supprimer le compte utilisateur
   */
  async deleteAccount(userId) {
    try {
      const users = await this.getUsers();
      const filteredUsers = users.filter(u => u.id !== userId);

      if (users.length === filteredUsers.length) {
        throw new Error('Utilisateur non trouvé');
      }

      await this.saveUsers(filteredUsers);
      await this.logout();

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      throw error;
    }
  }
}

export default new AuthService();
