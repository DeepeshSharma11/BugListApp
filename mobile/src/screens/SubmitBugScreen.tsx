import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { checkDuplicate, createBug } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export function SubmitBugScreen() {
  const { profile, session } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')

    if (!session?.user?.id) {
      setError('No active session found.')
      return
    }

    if (!profile?.team_id) {
      setError('Your profile does not have a team assigned yet.')
      return
    }

    if (description.trim().length < 20) {
      setError('Description must be at least 20 characters.')
      return
    }

    setSubmitting(true)

    try {
      const duplicate = await checkDuplicate(title, description, environment)
      if (duplicate.exists) {
        setError(`Duplicate bug found: ${duplicate.title}`)
        setSubmitting(false)
        return
      }

      const result = await createBug({
        title,
        description,
        environment,
        submittedBy: session.user.id,
        teamId: profile.team_id,
      })

      Alert.alert('Bug submitted', `Bug created successfully: ${result.id}`)
      setTitle('')
      setDescription('')
      setEnvironment('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit bug.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Submit Bug</Text>
        <Text style={styles.subtitle}>This uses the same FastAPI backend endpoint as the web app.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Lag on home page" placeholderTextColor="#64748b" />

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textarea]}
            multiline
            numberOfLines={6}
            placeholder="Describe the bug in detail..."
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Environment</Text>
          <TextInput value={environment} onChangeText={setEnvironment} style={styles.input} placeholder="Android 14 / Production" placeholderTextColor="#64748b" />

          <Text style={styles.helper}>Current team: {profile?.team_id || 'Not assigned'}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Submit Bug</Text>}
          </Pressable>
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
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    color: '#64748b',
  },
  card: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7f5',
    padding: 16,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: '#334155',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helper: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 13,
  },
  error: {
    marginTop: 12,
    color: '#dc2626',
    fontSize: 13,
  },
  button: {
    marginTop: 18,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
})
