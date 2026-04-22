import React, { useState } from 'react'
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { LoginScreen } from './src/screens/LoginScreen'
import { DashboardScreen } from './src/screens/DashboardScreen'
import { SubmitBugScreen } from './src/screens/SubmitBugScreen'
import { NotificationsScreen } from './src/screens/NotificationsScreen'

type TabKey = 'dashboard' | 'submit' | 'notifications'

function AppShell() {
  const { loading, session } = useAuth()
  const [tab, setTab] = useState<TabKey>('dashboard')

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.loadingText}>Loading mobile app...</Text>
      </SafeAreaView>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {tab === 'dashboard' ? <DashboardScreen /> : null}
        {tab === 'submit' ? <SubmitBugScreen /> : null}
        {tab === 'notifications' ? <NotificationsScreen /> : null}
      </View>

      <View style={styles.tabBar}>
        <TabButton label="Home" active={tab === 'dashboard'} onPress={() => setTab('dashboard')} />
        <TabButton label="Submit" active={tab === 'submit'} onPress={() => setTab('submit')} />
        <TabButton
          label="Alerts"
          active={tab === 'notifications'}
          onPress={() => setTab('notifications')}
        />
      </View>
    </SafeAreaView>
  )
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTabButton]}
    >
      <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>{label}</Text>
    </Pressable>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#dbe7f5',
    backgroundColor: '#ffffff',
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#edf2f7',
  },
  activeTabButton: {
    backgroundColor: '#0f172a',
  },
  tabButtonText: {
    color: '#475569',
    fontWeight: '700',
  },
  activeTabButtonText: {
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fbff',
  },
  loadingText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
})
