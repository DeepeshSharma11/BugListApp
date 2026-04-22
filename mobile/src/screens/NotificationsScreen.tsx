import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'

interface NotificationRow {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id, title, message, is_read, created_at')
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setNotifications(data ?? [])
      }

      setLoading(false)
    }

    void loadNotifications()
  }, [])

  async function markRead(id: string) {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Realtime-ish inbox backed by Supabase notifications table.</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#0f172a" />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {notifications.map((notification) => (
          <View
            key={notification.id}
            style={[
              styles.card,
              !notification.is_read && styles.unreadCard,
            ]}
          >
            <Text style={styles.cardTitle}>{notification.title}</Text>
            <Text style={styles.cardMessage}>{notification.message}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
              {!notification.is_read ? (
                <Pressable style={styles.markReadButton} onPress={() => void markRead(notification.id)}>
                  <Text style={styles.markReadText}>Mark read</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
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
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 10,
    color: '#64748b',
  },
  loadingBox: {
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7f5',
    padding: 16,
    marginBottom: 12,
  },
  unreadCard: {
    backgroundColor: '#eef6ff',
    borderColor: '#93c5fd',
  },
  cardTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0f172a',
  },
  cardMessage: {
    marginTop: 8,
    color: '#475569',
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    color: '#64748b',
    fontSize: 12,
  },
  markReadButton: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markReadText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
  },
})
