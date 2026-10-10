import { useEffect, useState } from 'react';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../constants/theme';
import { createId, deleteTask, getCategories, getTask, saveTask } from '../../lib/database';
import {
  cancelTaskReminder,
  scheduleTestReminder,
  syncTaskReminder,
} from '../../lib/reminders';
import type { Category, Task } from '../../types';

type PickerMode = 'date' | 'time' | null;

export default function TaskEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const database = useSQLiteContext();
  const isNew = id === 'new';
  const [task, setTask] = useState<Task | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingReminder, setTestingReminder] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [existing, availableCategories] = await Promise.all([
          isNew ? Promise.resolve(null) : getTask(database, id),
          getCategories(database),
        ]);
        if (!active) return;
        if (!isNew && !existing) {
          Alert.alert('Tarefa não encontrada', 'Ela pode ter sido excluída.');
          router.back();
          return;
        }
        setTask(
          existing ?? {
            id: createId(),
            title: '',
            description: '',
            completed: false,
            dueDateTime: null,
            createdAt: new Date().toISOString(),
            categoryId: null,
            notificationId: null,
          },
        );
        setCategories(availableCategories);
      } catch (error) {
        console.error('Falha ao abrir tarefa:', error);
        Alert.alert('Não foi possível abrir', 'O banco de dados não conseguiu carregar esta tarefa.');
        router.back();
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [database, id, isNew]);

  function updateTask(changes: Partial<Task>) {
    setTask((current) => (current ? { ...current, ...changes } : current));
  }

  function handleDateChange(_event: DateTimePickerChangeEvent, selectedDate: Date) {
    if (Platform.OS === 'android') setPickerMode(null);
    if (!task) return;

    const updated = task.dueDateTime ? new Date(task.dueDateTime) : new Date();
    if (pickerMode === 'date') {
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    } else {
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    }
    updateTask({ dueDateTime: updated.toISOString() });
  }

  async function handleSave() {
    if (!task) return;
    const title = task.title.trim();
    if (!title) {
      Alert.alert('Título obrigatório', 'Digite um título para salvar a tarefa.');
      return;
    }

    const nextTask = { ...task, title, description: task.description.trim() };
    setSaving(true);
    try {
      await saveTask(database, nextTask);
      try {
        const reminder = await syncTaskReminder(database, nextTask);
        if (reminder.permissionDenied) {
          Alert.alert(
            'Tarefa salva sem lembrete',
            'Ative as notificações nas configurações do dispositivo para receber lembretes.',
            [{ text: 'Entendi', onPress: () => router.back() }],
          );
          return;
        }
        if (reminder.skippedPastDue) {
          Alert.alert(
            'Tarefa salva sem lembrete',
            'A data e o horário escolhidos já passaram. Escolha um horário futuro para agendar uma notificação.',
            [{ text: 'Entendi', onPress: () => router.back() }],
          );
          return;
        }
      } catch (error) {
        console.error('Tarefa salva, mas não foi possível atualizar o lembrete:', error);
        Alert.alert(
          'Tarefa salva com aviso',
          'Não foi possível atualizar o lembrete. Verifique as permissões de notificação.',
          [{ text: 'Entendi', onPress: () => router.back() }],
        );
        return;
      }
      router.back();
    } catch (error) {
      console.error('Falha ao salvar tarefa:', error);
      Alert.alert('Não foi possível salvar', 'Confira os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestReminder() {
    setTestingReminder(true);
    try {
      const result = await scheduleTestReminder();
      if (result.permissionDenied) {
        Alert.alert(
          'Notificações desativadas',
          'Permita notificações para o Rotina nas configurações do dispositivo e tente novamente.',
        );
        return;
      }
      Alert.alert(
        'Teste agendado',
        'A notificação deve aparecer em cerca de 5 segundos. Se não aparecer, confira as permissões de notificação do dispositivo.',
      );
    } catch (error) {
      console.error('Falha ao agendar notificação de teste:', error);
      Alert.alert(
        'Não foi possível agendar o teste',
        error instanceof Error ? error.message : 'O sistema recusou o agendamento da notificação.',
      );
    } finally {
      setTestingReminder(false);
    }
  }

  function confirmDelete() {
    if (!task || isNew) return;
    Alert.alert('Excluir tarefa?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await cancelTaskReminder(task);
              await deleteTask(database, task.id);
              router.back();
            } catch (error) {
              console.error('Falha ao excluir tarefa ou cancelar lembrete:', error);
              Alert.alert(
                'Não foi possível excluir',
                'A tarefa continua salva porque não foi possível cancelar seu lembrete.',
              );
            }
          })();
        },
      },
    ]);
  }

  if (loading || !task) return <View style={styles.loading} />;
  const selectedDate = task.dueDateTime ? new Date(task.dueDateTime) : null;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>TÍTULO *</Text>
        <TextInput
          value={task.title}
          onChangeText={(title) => updateTask({ title })}
          placeholder="Ex.: Entregar o trabalho"
          placeholderTextColor={colors.muted}
          maxLength={120}
          returnKeyType="next"
          style={styles.input}
        />

        <Text style={styles.label}>DESCRIÇÃO</Text>
        <TextInput
          value={task.description}
          onChangeText={(description) => updateTask({ description })}
          placeholder="Adicione detalhes (opcional)"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.descriptionInput]}
        />

        <Text style={styles.label}>CATEGORIA</Text>
        <View style={styles.chipList}>
          <SelectChip
            label="Sem categoria"
            selected={!task.categoryId}
            onPress={() => updateTask({ categoryId: null })}
          />
          {categories.map((category) => (
            <SelectChip
              key={category.id}
              label={category.name}
              selected={task.categoryId === category.id}
              onPress={() => updateTask({ categoryId: category.id })}
            />
          ))}
          {categories.length === 0 ? (
            <Text style={styles.helperText}>Crie categorias pela tela principal.</Text>
          ) : null}
        </View>

        <Text style={styles.label}>PRAZO E LEMBRETE</Text>
        <View style={styles.dateActions}>
          <Pressable onPress={() => setPickerMode('date')} style={styles.dateButton}>
            <Text style={styles.dateButtonLabel}>Data</Text>
            <Text style={styles.dateButtonValue}>
              {selectedDate ? selectedDate.toLocaleDateString('pt-BR') : 'Selecionar'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPickerMode('time')} style={styles.dateButton}>
            <Text style={styles.dateButtonLabel}>Horário</Text>
            <Text style={styles.dateButtonValue}>
              {selectedDate
                ? selectedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : 'Selecionar'}
            </Text>
          </Pressable>
        </View>
        {task.dueDateTime ? (
          <Pressable onPress={() => updateTask({ dueDateTime: null })} style={styles.clearDate}>
            <Text style={styles.clearDateText}>Remover data e lembrete</Text>
          </Pressable>
        ) : (
          <Text style={styles.helperText}>Um lembrete local será agendado para um prazo futuro.</Text>
        )}
        {Platform.OS !== 'web' ? (
          <Pressable
            disabled={testingReminder}
            onPress={() => void handleTestReminder()}
            style={styles.testReminderButton}
          >
            <Text style={styles.testReminderText}>
              {testingReminder ? 'Agendando teste…' : 'Testar notificação (5 segundos)'}
            </Text>
          </Pressable>
        ) : null}
        {pickerMode ? (
          <>
            <DateTimePicker
              value={selectedDate ?? new Date()}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={handleDateChange}
              onDismiss={() => setPickerMode(null)}
              onNeutralButtonPress={() => {
                updateTask({ dueDateTime: null });
                setPickerMode(null);
              }}
              {...(Platform.OS === 'android' ? { neutralButton: { label: 'Limpar' } } : {})}
            />
            {Platform.OS === 'ios' ? (
              <Pressable onPress={() => setPickerMode(null)} style={styles.pickerDone}>
                <Text style={styles.pickerDoneText}>Concluir seleção</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {!isNew ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: task.completed }}
            onPress={() => updateTask({ completed: !task.completed })}
            style={styles.completionRow}
          >
            <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
              {task.completed ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.completionText}>Tarefa concluída</Text>
          </Pressable>
        ) : null}

        <Pressable
          disabled={saving}
          onPress={() => void handleSave()}
          style={[styles.saveButton, saving && styles.buttonDisabled]}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Salvando…' : 'Salvar tarefa'}</Text>
        </Pressable>
        {!isNew ? (
          <Pressable onPress={confirmDelete} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Excluir tarefa</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 44 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 9, marginTop: 14 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.ink,
    fontSize: 15,
  },
  descriptionInput: { minHeight: 94 },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 5 },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: colors.primary, fontWeight: '700' },
  helperText: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  testReminderButton: { alignSelf: 'flex-start', paddingVertical: 11 },
  testReminderText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  dateActions: { flexDirection: 'row', gap: 10 },
  dateButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 13,
  },
  dateButtonLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  dateButtonValue: { color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 5 },
  clearDate: { alignSelf: 'flex-start', paddingVertical: 10 },
  clearDateText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  pickerDone: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 4 },
  pickerDoneText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 24 },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#BCC6D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', lineHeight: 18 },
  completionText: { color: colors.ink, fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 27,
  },
  buttonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  deleteButton: { alignItems: 'center', paddingVertical: 17 },
  deleteButtonText: { color: colors.danger, fontWeight: '700' },
});
