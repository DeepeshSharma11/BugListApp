import React from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function DashboardScreen() {
  const { profile, session } = useAuth()

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Connected to Supabase auth and the same backend APIs.</Text>
          </View>

          <Pressable style={styles.secondaryButton} onPress={() => void supabase.auth.signOut()}>
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Full Name</Text>
          <Text style={styles.cardValue}>{profile?.full_name || session?.user.user_metadata?.full_name || 'Not available'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue}>{profile?.email || session?.user.email || 'Not available'}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardLabel}>Role</Text>
            <Text style={styles.cardValue}>{profile?.role || 'unknown'}</Text>
          </View>

          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardLabel}>Team ID</Text>
            <Text style={styles.smallValue}>{profile?.team_id || 'Not assigned'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  container: {
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748b',
    maxWidth: 240,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7f5',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  cardLabel: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardValue: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  smallValue: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe7f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontWeight: '700',
    color: '#0f172a',
  },
})
