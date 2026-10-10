import { useCallback, useEffect, useState } from 'react';
import { router, useIsFocused } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../constants/theme';
import { deleteCategory, getCategories, saveCategory } from '../lib/database';
import type { Category } from '../types';

export default function CategoriesScreen() {
  const database = useSQLiteContext();
  const isFocused = useIsFocused();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const refresh = useCallback(async () => {
    try {
      setCategories(await getCategories(database));
    } catch (error) {
      console.error('Falha ao carregar categorias:', error);
      Alert.alert('Não foi possível carregar', 'O banco de dados não conseguiu carregar as categorias.');
    }
  }, [database]);

  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    void getCategories(database)
      .then((nextCategories) => {
        if (active) setCategories(nextCategories);
      })
      .catch((error: unknown) => {
        console.error('Falha ao carregar categorias:', error);
        if (active) {
          Alert.alert(
            'Não foi possível carregar',
            'O banco de dados não conseguiu carregar as categorias.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [database, isFocused]);

  function openCreate() {
    setEditingId(null);
    setCategoryName('');
    setModalVisible(true);
  }

  function openEdit(category: Category) {
    setEditingId(category.id);
    setCategoryName(category.name);
    setModalVisible(true);
  }

  async function handleSave() {
    const name = categoryName.trim();
    if (!name) {
      Alert.alert('Nome obrigatório', 'Digite um nome para a categoria.');
      return;
    }
    try {
      await saveCategory(database, editingId, name);
      setModalVisible(false);
      await refresh();
    } catch (error) {
      console.error('Falha ao salvar categoria:', error);
      const message = String(error).toLowerCase().includes('unique')
        ? 'Já existe uma categoria com esse nome.'
        : 'Não foi possível salvar a categoria. Tente novamente.';
      Alert.alert('Não foi possível salvar', message);
    }
  }

  function confirmDelete(category: Category) {
    Alert.alert(
      `Excluir “${category.name}”?`,
      'As tarefas desta categoria continuarão salvas, mas ficarão sem categoria.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteCategory(database, category.id);
                await refresh();
              } catch (error) {
                console.error('Falha ao excluir categoria:', error);
                Alert.alert('Não foi possível excluir', 'Tente novamente.');
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Agrupe suas tarefas por assunto. Ao excluir uma categoria, suas tarefas ficam sem categoria.
        </Text>

        <Pressable onPress={openCreate} style={styles.createButton}>
          <Text style={styles.createButtonText}>+ Nova categoria</Text>
        </Pressable>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nenhuma categoria ainda</Text>
            <Text style={styles.emptyText}>Crie categorias para organizar melhor suas tarefas.</Text>
          </View>
        ) : (
          categories.map((category) => (
            <View key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryIconText}>{category.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Renomear ${category.name}`}
                onPress={() => openEdit(category)}
                style={styles.actionButton}
              >
                <Text style={styles.editText}>Renomear</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Excluir ${category.name}`}
                onPress={() => confirmDelete(category)}
                style={styles.deleteAction}
              >
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>
          ))
        )}

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar às tarefas</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Renomear categoria' : 'Nova categoria'}
            </Text>
            <TextInput
              autoFocus
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Ex.: Trabalho"
              placeholderTextColor={colors.muted}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => void handleSave()} style={styles.saveButton}>
                <Text style={styles.saveText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 44 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 17,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  emptyState: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginTop: 6,
  },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 19 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    padding: 12,
    marginBottom: 9,
  },
  categoryIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  categoryName: { flex: 1, color: colors.ink, fontWeight: '700', fontSize: 14 },
  actionButton: { paddingHorizontal: 4, paddingVertical: 8 },
  editText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  deleteAction: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.danger, fontSize: 22, fontWeight: '400' },
  backButton: { alignItems: 'center', paddingVertical: 19 },
  backButtonText: { color: colors.primary, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 25, 35, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 11, marginTop: 18 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 11 },
  cancelText: { color: colors.muted, fontWeight: '700' },
  saveButton: { backgroundColor: colors.primary, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 11 },
  saveText: { color: '#FFFFFF', fontWeight: '800' },
});
