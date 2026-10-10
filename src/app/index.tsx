import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '../constants/theme';
import { getCategories, getTasks, setTaskCompleted } from '../lib/database';
import { formatDateTime } from '../lib/format';
import { syncTaskReminder } from '../lib/reminders';
import type { Category, Task, TaskStatusFilter } from '../types';

const statusOptions: { label: string; value: TaskStatusFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Concluídas', value: 'completed' },
];

export default function TaskListScreen() {
  const database = useSQLiteContext();
  const isFocused = useIsFocused();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<TaskStatusFilter>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nextTasks, nextCategories] = await Promise.all([
        getTasks(database),
        getCategories(database),
      ]);
      setTasks(nextTasks);
      setCategories(nextCategories);
    } catch (error) {
      console.error('Falha ao carregar tarefas e categorias:', error);
      Alert.alert('Não foi possível carregar', 'O banco de dados não conseguiu carregar seus dados.');
    } finally {
      setLoading(false);
    }
  }, [database]);

  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    void Promise.all([getTasks(database), getCategories(database)])
      .then(([nextTasks, nextCategories]) => {
        if (!active) return;
        setTasks(nextTasks);
        setCategories(nextCategories);
      })
      .catch((error: unknown) => {
        console.error('Falha ao carregar tarefas e categorias:', error);
        if (active) {
          Alert.alert(
            'Não foi possível carregar',
            'O banco de dados não conseguiu carregar seus dados.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [database, isFocused]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesStatus =
          status === 'all' ||
          (status === 'pending' && !task.completed) ||
          (status === 'completed' && task.completed);
        return matchesStatus && (!categoryId || task.categoryId === categoryId);
      }),
    [categoryId, status, tasks],
  );

  async function toggleTask(task: Task) {
    const completed = !task.completed;
    const updatedTask = { ...task, completed };
    try {
      await setTaskCompleted(database, task.id, completed);
      const reminder = await syncTaskReminder(database, updatedTask);
      if (reminder.permissionDenied) {
        Alert.alert(
          'Lembrete desativado',
          'A tarefa foi atualizada, mas as notificações não estão autorizadas neste dispositivo.',
        );
      }
      await refresh();
    } catch (error) {
      console.error('Falha ao atualizar tarefa ou lembrete:', error);
      Alert.alert(
        'Tarefa atualizada com aviso',
        'O estado foi salvo, mas não foi possível atualizar o lembrete. Confira as permissões de notificação.',
      );
      await refresh();
    }
  }

  function openTask(taskId: string) {
    router.push(`/task/${taskId}`);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>ORGANIZE O SEU DIA</Text>
          <Text style={styles.heading}>Um passo de cada vez.</Text>
          <Text style={styles.subheading}>Suas tarefas, sempre em dia.</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/categories')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Categorias</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => openTask('new')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>+ Nova tarefa</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>STATUS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {statusOptions.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={status === option.value}
              onPress={() => setStatus(option.value)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>CATEGORIA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label="Todas"
            selected={!categoryId}
            onPress={() => setCategoryId(null)}
          />
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              label={category.name}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>Sua lista</Text>
          <Text style={styles.taskCount}>{filteredTasks.length}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {tasks.length === 0 ? 'Sua lista começa aqui' : 'Nenhuma tarefa encontrada'}
            </Text>
            <Text style={styles.emptyText}>
              {tasks.length === 0
                ? 'Crie uma tarefa para planejar seu próximo passo.'
                : 'Experimente mudar os filtros selecionados.'}
            </Text>
            {tasks.length === 0 ? (
              <Pressable onPress={() => openTask('new')} style={styles.emptyAction}>
                <Text style={styles.primaryButtonText}>Criar tarefa</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={openTask} onToggle={toggleTask} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function TaskCard({
  task,
  onOpen,
  onToggle,
}: {
  task: Task;
  onOpen: (id: string) => void;
  onToggle: (task: Task) => void;
}) {
  const dueDate = formatDateTime(task.dueDateTime);

  return (
    <View style={styles.taskCard}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        onPress={() => onToggle(task)}
        style={[styles.checkbox, task.completed && styles.checkboxChecked]}
      >
        {task.completed ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>
      <Pressable onPress={() => onOpen(task.id)} style={styles.taskBody}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
          {task.title}
        </Text>
        <View style={styles.taskMetadata}>
          {task.categoryName ? <Text style={styles.metadataText}>{task.categoryName}</Text> : null}
          {dueDate ? <Text style={styles.metadataText}>· {dueDate}</Text> : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${task.title}`}
        onPress={() => onOpen(task.id)}
        style={styles.editButton}
      >
        <Text style={styles.editButtonText}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 44 },
  intro: { marginTop: 8, marginBottom: 22 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heading: { color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 9 },
  subheading: { color: colors.muted, fontSize: 15, marginTop: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 27 },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    minHeight: 48,
    paddingHorizontal: 17,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 2,
  },
  chipRow: { gap: 8, paddingBottom: 18 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 20,
  },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: colors.primary, fontWeight: '700' },
  listHeading: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 2, marginBottom: 13 },
  listTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  taskCount: {
    minWidth: 25,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    fontSize: 12,
    fontWeight: '700',
  },
  loader: { marginTop: 30 },
  emptyState: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 7 },
  emptyAction: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 17,
    borderRadius: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    gap: 12,
  },
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
  taskBody: { flex: 1, gap: 7 },
  taskTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  taskTitleCompleted: { color: colors.completed, textDecorationLine: 'line-through' },
  taskMetadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metadataText: { color: colors.muted, fontSize: 12 },
  editButton: { width: 24, alignItems: 'center' },
  editButtonText: { color: colors.muted, fontSize: 26, lineHeight: 28 },
});
