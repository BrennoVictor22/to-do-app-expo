import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task } from '../types';
import { setTaskNotificationId } from './database';

setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureNotificationPermission() {
  const supportsAndroidChannels = Platform.OS === 'android' && !isRunningInExpoGo();
  if (supportsAndroidChannels) {
    await setNotificationChannelAsync('task-reminders', {
      name: 'Lembretes de tarefas',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const currentPermissions = await getPermissionsAsync();
  const permissions =
    currentPermissions.status === 'granted'
      ? currentPermissions
      : await requestPermissionsAsync();

  return {
    granted: permissions.status === 'granted',
    supportsAndroidChannels,
  };
}

export async function syncTaskReminder(database: SQLiteDatabase, task: Task) {
  if (task.notificationId) {
    await cancelScheduledNotificationAsync(task.notificationId);
    await setTaskNotificationId(database, task.id, null);
  }

  if (task.completed || !task.dueDateTime) {
    return { notificationId: null, permissionDenied: false, skippedPastDue: false };
  }

  const dueDate = new Date(task.dueDateTime);
  if (!Number.isFinite(dueDate.getTime()) || dueDate.getTime() <= Date.now()) {
    return { notificationId: null, permissionDenied: false, skippedPastDue: true };
  }

  if (Platform.OS === 'web') {
    return { notificationId: null, permissionDenied: true, skippedPastDue: false };
  }

  const { granted, supportsAndroidChannels } = await ensureNotificationPermission();
  if (!granted) {
    return { notificationId: null, permissionDenied: true, skippedPastDue: false };
  }

  const notificationId = await scheduleNotificationAsync({
    content: {
      title: 'Lembrete de tarefa',
      body: task.title,
      data: { taskId: task.id },
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: dueDate,
      ...(supportsAndroidChannels ? { channelId: 'task-reminders' } : {}),
    },
  });

  try {
    await setTaskNotificationId(database, task.id, notificationId);
  } catch (error) {
    await cancelScheduledNotificationAsync(notificationId);
    throw error;
  }

  return { notificationId, permissionDenied: false, skippedPastDue: false };
}

export async function scheduleTestReminder() {
  if (Platform.OS === 'web') {
    return { permissionDenied: true };
  }

  const { granted, supportsAndroidChannels } = await ensureNotificationPermission();
  if (!granted) {
    return { permissionDenied: true };
  }

  await scheduleNotificationAsync({
    content: {
      title: 'Teste de lembrete',
      body: 'As notificações locais estão funcionando neste dispositivo.',
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      ...(supportsAndroidChannels ? { channelId: 'task-reminders' } : {}),
    },
  });

  return { permissionDenied: false };
}

export async function cancelTaskReminder(task: Task) {
  if (task.notificationId) {
    await cancelScheduledNotificationAsync(task.notificationId);
  }
}
