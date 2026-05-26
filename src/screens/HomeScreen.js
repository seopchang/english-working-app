import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { showAlert, showConfirm } from '../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getPassages,
  deletePassage,
  savePassages,
  updatePassageTitle,
  getFolders,
  saveFolders,
  createFolder,
  updateFolderName,
  deleteFolder,
  movePassageToFolder,
  createSharedPack,
  getSharedPack,
  importSharedPack,
} from '../utils/storage';
import AddPassageModal from '../components/AddPassageModal';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function calcProgress(passages) {
  if (!passages.length) return { completed: 0, total: 0, pct: 0 };
  const total = passages.length * 4;
  let completed = 0;
  passages.forEach((p) => {
    if (p.progress?.type1?.completed) completed++;
    if (p.progress?.type3?.completed) completed++;
    if (p.progress?.type4?.completed) completed++;
    if (p.progress?.vocab?.completed) completed++;
  });
  return { completed, total, pct: Math.round((completed / total) * 100) };
}

export default function HomeScreen({ navigation }) {
  const [passages, setPassages] = useState([]);
  const [folders, setFolders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // 순서 편집
  const [isReordering, setIsReordering] = useState(false);
  const [isReorderingFolders, setIsReorderingFolders] = useState(false);

  // 다중 선택 모드
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedPassageIds, setSelectedPassageIds] = useState(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());

  // 아코디언
  const [openFolders, setOpenFolders] = useState({});

  // 제목 수정 모달
  const [editTitleId, setEditTitleId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');

  // 폴더 이름 수정 모달
  const [editFolderId, setEditFolderId] = useState(null);
  const [editFolderText, setEditFolderText] = useState('');

  // 폴더 생성 모달
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // 폴더로 이동 모달
  const [movingPassageId, setMovingPassageId] = useState(null);

  // 공유 팩 생성 모달
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareResult, setShareResult] = useState(null); // { code }

  // 코드로 받기 모달
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // pack data

  const load = async () => {
    const [p, f] = await Promise.all([getPassages(), getFolders()]);
    setPassages(p);
    setFolders(f);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  // ── 선택 모드 ──────────────────────────────────────
  const toggleSelectMode = () => {
    setIsSelecting((v) => {
      if (v) {
        setSelectedPassageIds(new Set());
        setSelectedFolderIds(new Set());
      }
      return !v;
    });
    setIsReordering(false);
    setIsReorderingFolders(false);
  };

  const togglePassageSelect = (id) => {
    setSelectedPassageIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFolderSelect = (id) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalSelected = selectedPassageIds.size + selectedFolderIds.size;

  // ── 공유 팩 생성 ────────────────────────────────────
  const handleOpenShareModal = () => {
    if (totalSelected === 0) {
      showAlert('선택 없음', '공유할 지문 또는 폴더를 먼저 선택해주세요.');
      return;
    }
    setShareTitle('');
    setShareResult(null);
    setShareModalVisible(true);
  };

  const handleCreateShare = async () => {
    if (!shareTitle.trim()) {
      showAlert('제목 없음', '팩 제목을 입력해주세요.');
      return;
    }
    setShareLoading(true);
    const result = await createSharedPack({
      title: shareTitle.trim(),
      passageIds: Array.from(selectedPassageIds),
      folderIds: Array.from(selectedFolderIds),
    });
    setShareLoading(false);
    if (result.success) {
      setShareResult({ code: result.code });
    } else {
      showAlert('오류', '공유 코드 생성에 실패했습니다.');
    }
  };

  const handleCloseShareModal = () => {
    setShareModalVisible(false);
    setShareResult(null);
    setShareTitle('');
    setIsSelecting(false);
    setSelectedPassageIds(new Set());
    setSelectedFolderIds(new Set());
  };

  // ── 코드로 받기 ─────────────────────────────────────
  const handleSearchCode = async () => {
    if (importCode.trim().length < 6) {
      showAlert('오류', '6자리 코드를 입력해주세요.');
      return;
    }
    setImportLoading(true);
    setImportPreview(null);
    const pack = await getSharedPack(importCode.trim());
    setImportLoading(false);
    if (!pack) {
      showAlert('없음', '해당 코드의 공유 팩을 찾을 수 없습니다.');
      return;
    }
    setImportPreview(pack);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    const ok = await importSharedPack(importPreview);
    setImportLoading(false);
    if (ok) {
      setImportModalVisible(false);
      setImportCode('');
      setImportPreview(null);
      load();
      showAlert('완료', `${importPreview.passageCount}개 지문을 가져왔습니다.`);
    } else {
      showAlert('오류', '가져오기에 실패했습니다.');
    }
  };

  // ── 지문 핸들러 ──────────────────────────────────────
  const handleDelete = (id, title) => {
    showConfirm('지문 삭제', `"${title}"를 삭제하시겠습니까?`, async () => {
      await deletePassage(id); load();
    });
  };

  const handleMovePassage = async (index, direction, list) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const allNext = [...passages];
    const idxA = allNext.findIndex((p) => p.id === list[index].id);
    const idxB = allNext.findIndex((p) => p.id === list[target].id);
    [allNext[idxA], allNext[idxB]] = [allNext[idxB], allNext[idxA]];
    setPassages(allNext);
    await savePassages(allNext);
  };

  const openEditTitle = (id, currentTitle) => {
    setEditTitleId(id);
    setEditTitleText(currentTitle);
  };

  const handleSaveTitle = async () => {
    if (!editTitleText.trim()) return;
    await updatePassageTitle(editTitleId, editTitleText.trim());
    setEditTitleId(null);
    setEditTitleText('');
    load();
  };

  // ── 폴더로 이동 ──────────────────────────────────────
  const handleMoveToFolder = async (folderId) => {
    await movePassageToFolder(movingPassageId, folderId);
    setMovingPassageId(null);
    load();
  };

  // ── 폴더 핸들러 ──────────────────────────────────────
  const toggleFolder = (id) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setCreateFolderVisible(false);
    load();
  };

  const handleDeleteFolder = (id, name) => {
    showConfirm('폴더 삭제', `"${name}" 폴더를 삭제할까요?\n폴더 안 지문은 홈 목록으로 돌아옵니다.`, async () => {
      await deleteFolder(id); load();
    });
  };

  const handleMoveFolderOrder = async (index, direction) => {
    const next = [...folders];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFolders(next);
    await saveFolders(next);
  };

  const openEditFolder = (id, name) => {
    setEditFolderId(id);
    setEditFolderText(name);
  };

  const handleSaveFolderName = async () => {
    if (!editFolderText.trim()) return;
    await updateFolderName(editFolderId, editFolderText.trim());
    setEditFolderId(null);
    setEditFolderText('');
    load();
  };

  const unfoldered = passages.filter((p) => !p.folderId);
  const prog = calcProgress(passages);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 다크 진도 카드 */}
        <View style={s.card}>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.sub}>꾸준한 학습이 실력을 만듭니다.</Text>
          <View style={s.stats}>
            <StatItem label="전체 진도" value={`${prog.pct}%`} />
            <View style={s.statDivider} />
            <StatItem label="완료 활동" value={`${prog.completed}/${prog.total}`} />
            <View style={s.statDivider} />
            <StatItem label="등록 지문" value={`${passages.length}개`} />
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${prog.pct}%` }]} />
          </View>
        </View>

        {/* 버튼 행 */}
        <View style={s.addRow}>
          <TouchableOpacity
            style={[s.addBtn, { flex: 1 }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={s.addBtnText}>지문 추가</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.addBtnOutline, { flex: 1 }]}
            onPress={() => setCreateFolderVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="folder-open-outline" size={18} color="#000000" />
            <Text style={s.addBtnOutlineText}>폴더 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 공유 버튼 행 */}
        <View style={s.shareRow}>
          <TouchableOpacity
            style={[s.shareBtn, isSelecting && s.shareBtnActive]}
            onPress={toggleSelectMode}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isSelecting ? 'close-circle-outline' : 'checkmark-circle-outline'}
              size={16}
              color={isSelecting ? '#FFFFFF' : '#000000'}
            />
            <Text style={[s.shareBtnText, isSelecting && s.shareBtnTextActive]}>
              {isSelecting ? `${totalSelected}개 선택됨` : '선택하기'}
            </Text>
          </TouchableOpacity>

          {isSelecting && (
            <TouchableOpacity
              style={[s.shareActionBtn, totalSelected === 0 && s.shareActionBtnDisabled]}
              onPress={handleOpenShareModal}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={16} color="#FFFFFF" />
              <Text style={s.shareActionBtnText}>공유 코드 생성</Text>
            </TouchableOpacity>
          )}

          {!isSelecting && (
            <TouchableOpacity
              style={s.importBtn}
              onPress={() => { setImportCode(''); setImportPreview(null); setImportModalVisible(true); }}
              activeOpacity={0.85}
            >
              <Ionicons name="download-outline" size={16} color="#000000" />
              <Text style={s.importBtnText}>코드로 받기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 학습 지문 섹션 ── */}
        <View style={s.listHeader}>
          <Text style={s.listTitle}>학습 지문</Text>
          <View style={s.listHeaderRight}>
            <Text style={s.listCount}>{unfoldered.length}개</Text>
            {!isSelecting && unfoldered.length > 1 && (
              <TouchableOpacity
                style={[s.reorderBtn, isReordering && s.reorderBtnActive]}
                onPress={() => setIsReordering((v) => !v)}
                activeOpacity={0.75}
              >
                <Text style={[s.reorderBtnText, isReordering && s.reorderBtnTextActive]}>
                  {isReordering ? '완료' : '순서 편집'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {unfoldered.length === 0 ? (
          <EmptyState />
        ) : (
          unfoldered.map((p, index) => (
            <PassageCard
              key={p.id}
              passage={p}
              isReordering={isReordering}
              isSelecting={isSelecting}
              isSelected={selectedPassageIds.has(p.id)}
              isFirst={index === 0}
              isLast={index === unfoldered.length - 1}
              onPress={() => {
                if (isSelecting) togglePassageSelect(p.id);
                else if (!isReordering) navigation.navigate('PassageDetail', { passageId: p.id });
              }}
              onDelete={() => handleDelete(p.id, p.title)}
              onMoveUp={() => handleMovePassage(index, -1, unfoldered)}
              onMoveDown={() => handleMovePassage(index, 1, unfoldered)}
              onEditTitle={() => openEditTitle(p.id, p.title)}
              onMoveToFolder={() => setMovingPassageId(p.id)}
            />
          ))
        )}

        {/* ── 폴더 섹션 ── */}
        {folders.length > 0 && (
          <>
            <View style={[s.listHeader, { marginTop: 8 }]}>
              <Text style={s.listTitle}>폴더</Text>
              <View style={s.listHeaderRight}>
                <Text style={s.listCount}>{folders.length}개</Text>
                {!isSelecting && folders.length > 1 && (
                  <TouchableOpacity
                    style={[s.reorderBtn, isReorderingFolders && s.reorderBtnActive]}
                    onPress={() => setIsReorderingFolders((v) => !v)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.reorderBtnText, isReorderingFolders && s.reorderBtnTextActive]}>
                      {isReorderingFolders ? '완료' : '순서 편집'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {folders.map((folder, fi) => {
              const folderPassages = passages.filter((p) => p.folderId === folder.id);
              const isOpen = !!openFolders[folder.id];
              const isFolderSelected = selectedFolderIds.has(folder.id);

              return (
                <View key={folder.id} style={[s.folderBlock, isSelecting && isFolderSelected && s.folderBlockSelected]}>
                  <TouchableOpacity
                    style={s.folderHeader}
                    onPress={() => {
                      if (isSelecting) toggleFolderSelect(folder.id);
                      else if (!isReorderingFolders) toggleFolder(folder.id);
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelecting && (
                      <View style={[s.checkbox, isFolderSelected && s.checkboxSelected]}>
                        {isFolderSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                      </View>
                    )}
                    {isReorderingFolders && (
                      <View style={s.reorderArrows}>
                        <TouchableOpacity
                          onPress={() => handleMoveFolderOrder(fi, -1)}
                          disabled={fi === 0}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="chevron-up" size={20} color={fi === 0 ? '#DDDDDD' : '#000000'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleMoveFolderOrder(fi, 1)}
                          disabled={fi === folders.length - 1}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="chevron-down" size={20} color={fi === folders.length - 1 ? '#DDDDDD' : '#000000'} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <Ionicons
                      name={isOpen ? 'folder-open' : 'folder'}
                      size={20}
                      color={isFolderSelected && isSelecting ? '#000000' : '#000000'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={s.folderName} numberOfLines={1}>{folder.name}</Text>
                    <Text style={s.folderCount}>{folderPassages.length}개</Text>
                    {!isReorderingFolders && !isSelecting && (
                      <View style={s.folderActions}>
                        <TouchableOpacity
                          onPress={() => openEditFolder(folder.id, folder.name)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="create-outline" size={15} color="#AAAAAA" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteFolder(folder.id, folder.name)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={15} color="#CCCCCC" />
                        </TouchableOpacity>
                        <Ionicons
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#AAAAAA"
                        />
                      </View>
                    )}
                  </TouchableOpacity>

                  {isOpen && !isSelecting && (
                    <View style={s.folderContent}>
                      {folderPassages.length === 0 ? (
                        <Text style={s.folderEmpty}>지문이 없습니다.</Text>
                      ) : (
                        folderPassages.map((p, pi) => (
                          <PassageCard
                            key={p.id}
                            passage={p}
                            isReordering={false}
                            isSelecting={false}
                            isSelected={false}
                            isFirst={pi === 0}
                            isLast={pi === folderPassages.length - 1}
                            onPress={() => navigation.navigate('PassageDetail', { passageId: p.id })}
                            onDelete={() => handleDelete(p.id, p.title)}
                            onMoveUp={() => handleMovePassage(pi, -1, folderPassages)}
                            onMoveDown={() => handleMovePassage(pi, 1, folderPassages)}
                            onEditTitle={() => openEditTitle(p.id, p.title)}
                            onMoveToFolder={() => setMovingPassageId(p.id)}
                            inFolder
                          />
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* 지문 추가 모달 */}
      <AddPassageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { setModalVisible(false); load(); }}
      />

      {/* 지문 제목 수정 모달 */}
      <NameModal
        visible={editTitleId !== null}
        label="지문 제목 수정"
        value={editTitleText}
        onChange={setEditTitleText}
        onCancel={() => setEditTitleId(null)}
        onSave={handleSaveTitle}
        maxLength={40}
      />

      {/* 폴더 이름 수정 모달 */}
      <NameModal
        visible={editFolderId !== null}
        label="폴더 이름 수정"
        value={editFolderText}
        onChange={setEditFolderText}
        onCancel={() => setEditFolderId(null)}
        onSave={handleSaveFolderName}
        maxLength={30}
      />

      {/* 폴더 생성 모달 */}
      <NameModal
        visible={createFolderVisible}
        label="새 폴더 이름"
        value={newFolderName}
        onChange={setNewFolderName}
        onCancel={() => { setCreateFolderVisible(false); setNewFolderName(''); }}
        onSave={handleCreateFolder}
        maxLength={30}
        placeholder="폴더 이름을 입력하세요"
      />

      {/* 폴더로 이동 모달 */}
      <Modal visible={movingPassageId !== null} transparent animationType="fade">
        <TouchableOpacity
          style={s.titleModalOverlay}
          activeOpacity={1}
          onPress={() => setMovingPassageId(null)}
        >
          <TouchableOpacity style={s.titleModalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={s.titleModalLabel}>폴더로 이동</Text>
            <TouchableOpacity style={s.folderPickRow} onPress={() => handleMoveToFolder(null)}>
              <Ionicons name="home-outline" size={18} color="#555555" />
              <Text style={s.folderPickText}>홈 (폴더 없음)</Text>
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={s.folderPickRow}
                onPress={() => handleMoveToFolder(f.id)}
              >
                <Ionicons name="folder-outline" size={18} color="#555555" />
                <Text style={s.folderPickText}>{f.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.titleModalCancel} onPress={() => setMovingPassageId(null)}>
              <Text style={s.titleModalCancelText}>취소</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 공유 코드 생성 모달 */}
      <Modal visible={shareModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={s.titleModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.titleModalBox}>
            {shareResult ? (
              // 코드 발급 완료 화면
              <>
                <View style={s.codeResultIcon}>
                  <Ionicons name="checkmark-circle" size={40} color="#22C55E" />
                </View>
                <Text style={s.codeResultTitle}>공유 코드가 생성됐어요!</Text>
                <Text style={s.codeResultSub}>아래 코드를 공유하세요</Text>
                <View style={s.codeBox}>
                  <Text style={s.codeText}>{shareResult.code}</Text>
                </View>
                <Text style={s.codeHint}>
                  {`지문 ${passages.filter(p => selectedPassageIds.has(p.id)).length + folders.filter(f => selectedFolderIds.has(f.id)).reduce((acc, f) => acc + passages.filter(p => p.folderId === f.id).length, 0)}개 포함`}
                </Text>
                <TouchableOpacity style={s.codeCloseBtn} onPress={handleCloseShareModal}>
                  <Text style={s.codeCloseBtnText}>닫기</Text>
                </TouchableOpacity>
              </>
            ) : (
              // 제목 입력 화면
              <>
                <Text style={s.titleModalLabel}>공유 팩 이름 입력</Text>
                <Text style={s.shareSubText}>
                  {`지문 ${selectedPassageIds.size}개, 폴더 ${selectedFolderIds.size}개 선택됨`}
                </Text>
                <TextInput
                  style={s.titleModalInput}
                  value={shareTitle}
                  onChangeText={setShareTitle}
                  placeholder="예: 수능 2025 영어 지문 모음"
                  placeholderTextColor="#BBBBBB"
                  maxLength={40}
                  autoFocus
                />
                <View style={s.titleModalBtns}>
                  <TouchableOpacity style={s.titleModalCancel} onPress={handleCloseShareModal}>
                    <Text style={s.titleModalCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.titleModalSave, (!shareTitle.trim() || shareLoading) && s.titleModalSaveDisabled]}
                    onPress={handleCreateShare}
                    disabled={!shareTitle.trim() || shareLoading}
                  >
                    {shareLoading
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Text style={s.titleModalSaveText}>코드 생성</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 코드로 받기 모달 */}
      <Modal visible={importModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={s.titleModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.titleModalBox}>
            <Text style={s.titleModalLabel}>코드로 지문 받기</Text>
            <TextInput
              style={[s.titleModalInput, { letterSpacing: 4, fontSize: 18, fontWeight: '700' }]}
              value={importCode}
              onChangeText={(t) => { setImportCode(t.toUpperCase()); setImportPreview(null); }}
              placeholder="6자리 코드 입력"
              placeholderTextColor="#BBBBBB"
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />

            {importPreview && (
              <View style={s.importPreviewBox}>
                <Text style={s.importPreviewTitle}>{importPreview.title}</Text>
                <Text style={s.importPreviewSub}>
                  {`지문 ${importPreview.passageCount}개 · 폴더 ${importPreview.folders?.length ?? 0}개`}
                </Text>
              </View>
            )}

            <View style={s.titleModalBtns}>
              <TouchableOpacity
                style={s.titleModalCancel}
                onPress={() => { setImportModalVisible(false); setImportCode(''); setImportPreview(null); }}
              >
                <Text style={s.titleModalCancelText}>취소</Text>
              </TouchableOpacity>

              {!importPreview ? (
                <TouchableOpacity
                  style={[s.titleModalSave, (importCode.length < 6 || importLoading) && s.titleModalSaveDisabled]}
                  onPress={handleSearchCode}
                  disabled={importCode.length < 6 || importLoading}
                >
                  {importLoading
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={s.titleModalSaveText}>검색</Text>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.titleModalSave, importLoading && s.titleModalSaveDisabled]}
                  onPress={handleImport}
                  disabled={importLoading}
                >
                  {importLoading
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={s.titleModalSaveText}>가져오기</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── 공용 이름 입력 모달 ──────────────────────────────
function NameModal({ visible, label, value, onChange, onCancel, onSave, maxLength, placeholder }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={s.titleModalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.titleModalBox}>
          <Text style={s.titleModalLabel}>{label}</Text>
          <TextInput
            style={s.titleModalInput}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder || '새 이름을 입력하세요'}
            placeholderTextColor="#BBBBBB"
            maxLength={maxLength || 40}
            autoFocus
          />
          <View style={s.titleModalBtns}>
            <TouchableOpacity style={s.titleModalCancel} onPress={onCancel}>
              <Text style={s.titleModalCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.titleModalSave, !value.trim() && s.titleModalSaveDisabled]}
              onPress={onSave}
              disabled={!value.trim()}
            >
              <Text style={s.titleModalSaveText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={s.empty}>
      <Ionicons name="document-text-outline" size={52} color="#DDDDDD" />
      <Text style={s.emptyTitle}>등록된 지문이 없습니다</Text>
      <Text style={s.emptySub}>위의 버튼으로 첫 번째 지문을 추가해보세요.</Text>
    </View>
  );
}

function PassageCard({
  passage, onPress, onDelete, onMoveUp, onMoveDown, onEditTitle, onMoveToFolder,
  isReordering, isSelecting, isSelected, isFirst, isLast, inFolder,
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const acts = [
    { key: 'type1', label: 'WB1' },
    { key: 'type3', label: 'WB2' },
    { key: 'type4', label: 'WB3' },
    { key: 'vocab', label: 'VOC' },
  ];
  const reviewCount = passage.progress?.reviewCount || 0;
  const hasLongText = passage.originalText && passage.originalText.length > 120;

  return (
    <TouchableOpacity
      style={[s.pCard, inFolder && s.pCardInFolder, isSelecting && isSelected && s.pCardSelected]}
      onPress={onPress}
      activeOpacity={isReordering ? 1 : 0.72}
    >
      <View style={s.pCardTop}>
        {isSelecting && (
          <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
        )}
        {isReordering && (
          <View style={s.reorderArrows}>
            <TouchableOpacity onPress={onMoveUp} disabled={isFirst} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-up" size={20} color={isFirst ? '#DDDDDD' : '#000000'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onMoveDown} disabled={isLast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-down" size={20} color={isLast ? '#DDDDDD' : '#000000'} />
            </TouchableOpacity>
          </View>
        )}
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={s.titleRow}>
            <Text style={s.pTitle} numberOfLines={1}>{passage.title}</Text>
            {!isReordering && !isSelecting && (
              <TouchableOpacity
                onPress={onEditTitle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="create-outline" size={14} color="#AAAAAA" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.pDate}>{new Date(passage.createdAt).toLocaleDateString('ko-KR')}</Text>
        </View>
        {!isReordering && !isSelecting && (
          <View style={s.pCardRight}>
            {reviewCount > 0 && (
              <View style={s.reviewBadge}>
                <Text style={s.reviewBadgeText}>{reviewCount}회독</Text>
              </View>
            )}
            <TouchableOpacity onPress={onMoveToFolder} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="folder-outline" size={15} color="#AAAAAA" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="trash-outline" size={15} color="#CCCCCC" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={s.pExcerpt} numberOfLines={isExpanded ? undefined : 2}>
        {passage.originalText}
      </Text>
      {hasLongText && !isReordering && !isSelecting && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation && e.stopPropagation(); setIsExpanded((v) => !v); }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={s.expandBtn}
          activeOpacity={0.7}
        >
          <Text style={s.expandBtnText}>{isExpanded ? '접기' : '더보기'}</Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#888888" />
        </TouchableOpacity>
      )}

      {!isReordering && !isSelecting && (
        <View style={s.pBadges}>
          {acts.map(({ key, label }) => {
            const done = passage.progress?.[key]?.completed;
            return (
              <View key={key} style={[s.badge, done && s.badgeDone]}>
                <Text style={[s.badgeText, done && s.badgeTextDone]}>{label}</Text>
              </View>
            );
          })}
          <Ionicons name="chevron-forward" size={14} color="#CCCCCC" style={{ marginLeft: 'auto' }} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 22,
    marginBottom: 12,
  },
  greeting: { fontSize: 23, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, marginBottom: 20 },
  stats: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  barBg: { height: 2.5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  barFill: { height: 2.5, backgroundColor: '#FFFFFF', borderRadius: 2 },

  addRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#222222', borderRadius: 12, paddingVertical: 14, gap: 8,
  },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.3 },
  addBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, gap: 8,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  addBtnOutlineText: { fontSize: 15, fontWeight: '600', color: '#000000', letterSpacing: -0.3 },

  // 공유 버튼 행
  shareRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 1, borderRadius: 12, paddingVertical: 11, gap: 6,
    borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FFFFFF',
  },
  shareBtnActive: { backgroundColor: '#000000', borderColor: '#000000' },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: '#000000' },
  shareBtnTextActive: { color: '#FFFFFF' },
  shareActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 1, borderRadius: 12, paddingVertical: 11, gap: 6,
    backgroundColor: '#000000',
  },
  shareActionBtnDisabled: { backgroundColor: '#CCCCCC' },
  shareActionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flex: 1, borderRadius: 12, paddingVertical: 11, gap: 6,
    borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FFFFFF',
  },
  importBtnText: { fontSize: 14, fontWeight: '600', color: '#000000' },

  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, paddingHorizontal: 2,
  },
  listTitle: { fontSize: 17, fontWeight: '700', color: '#000000', letterSpacing: -0.5 },
  listHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listCount: { fontSize: 13, color: '#AAAAAA' },
  reorderBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: '#DDDDDD', backgroundColor: '#FFFFFF',
  },
  reorderBtnActive: { backgroundColor: '#000000', borderColor: '#000000' },
  reorderBtnText: { fontSize: 12, fontWeight: '600', color: '#555555' },
  reorderBtnTextActive: { color: '#FFFFFF' },

  empty: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#AAAAAA' },
  emptySub: { fontSize: 13, color: '#CCCCCC', textAlign: 'center', lineHeight: 20 },

  // 체크박스
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#DDDDDD', backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  checkboxSelected: { backgroundColor: '#000000', borderColor: '#000000' },

  // 지문 카드
  pCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  pCardInFolder: { marginBottom: 8, borderRadius: 10 },
  pCardSelected: { borderWidth: 2, borderColor: '#000000' },
  pCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  pCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reorderArrows: { flexDirection: 'column', alignItems: 'center', gap: 2, marginRight: 4 },
  reviewBadge: { backgroundColor: '#000000', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reviewBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  pTitle: { fontSize: 15, fontWeight: '700', color: '#000000', letterSpacing: -0.4, flex: 1 },
  pDate: { fontSize: 11, color: '#BBBBBB', marginTop: 2 },
  pExcerpt: { fontSize: 13, color: '#777777', lineHeight: 19, marginBottom: 4 },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginBottom: 10, paddingVertical: 2,
  },
  expandBtnText: { fontSize: 12, fontWeight: '600', color: '#888888' },
  pBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: '#E8E8E8',
  },
  badgeDone: { backgroundColor: '#000000', borderColor: '#000000' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#AAAAAA', letterSpacing: 0.3 },
  badgeTextDone: { color: '#FFFFFF' },

  // 폴더
  folderBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  folderBlockSelected: { borderWidth: 2, borderColor: '#000000' },
  folderHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 0 },
  folderName: { fontSize: 15, fontWeight: '700', color: '#000000', flex: 1, letterSpacing: -0.4 },
  folderCount: { fontSize: 12, color: '#AAAAAA', marginRight: 8 },
  folderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  folderContent: {
    paddingHorizontal: 10, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8,
  },
  folderEmpty: { fontSize: 13, color: '#BBBBBB', textAlign: 'center', paddingVertical: 16 },

  // 폴더 이동
  folderPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  folderPickText: { fontSize: 14, color: '#333333', fontWeight: '500' },

  // 공용 이름 모달
  titleModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  titleModalBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 22, width: '100%' },
  titleModalLabel: { fontSize: 15, fontWeight: '700', color: '#000000', marginBottom: 6, letterSpacing: -0.4 },
  shareSubText: { fontSize: 12, color: '#AAAAAA', marginBottom: 12 },
  titleModalInput: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#000000', backgroundColor: '#FAFAFA', marginBottom: 16,
  },
  titleModalBtns: { flexDirection: 'row', gap: 10 },
  titleModalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', marginTop: 8,
  },
  titleModalCancelText: { fontSize: 14, fontWeight: '600', color: '#555555' },
  titleModalSave: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#000000', alignItems: 'center',
  },
  titleModalSaveDisabled: { backgroundColor: '#CCCCCC' },
  titleModalSaveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // 공유 코드 결과
  codeResultIcon: { alignItems: 'center', marginBottom: 8 },
  codeResultTitle: { fontSize: 17, fontWeight: '800', color: '#000000', textAlign: 'center', letterSpacing: -0.5 },
  codeResultSub: { fontSize: 13, color: '#888888', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  codeBox: {
    backgroundColor: '#F5F5F5', borderRadius: 14, paddingVertical: 20,
    alignItems: 'center', marginBottom: 8,
  },
  codeText: { fontSize: 36, fontWeight: '900', color: '#000000', letterSpacing: 8 },
  codeHint: { fontSize: 12, color: '#AAAAAA', textAlign: 'center', marginBottom: 16 },
  codeCloseBtn: {
    backgroundColor: '#000000', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  codeCloseBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // 가져오기 미리보기
  importPreviewBox: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  importPreviewTitle: { fontSize: 15, fontWeight: '700', color: '#000000', marginBottom: 4 },
  importPreviewSub: { fontSize: 13, color: '#888888' },
});
