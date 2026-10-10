import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { migrateDatabase } from '../lib/database';
import { colors } from '../constants/theme';

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider databaseName="rotina.db" onInit={migrateDatabase} useSuspense>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Minhas tarefas' }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Tarefa', presentation: 'modal' }} />
          <Stack.Screen name="categories" options={{ title: 'Categorias' }} />
        </Stack>
      </SQLiteProvider>
    </Suspense>
  );
}
