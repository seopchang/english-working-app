import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  updateDoc, query, orderBy, writeBatch, serverTimestamp,
  where, increment,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const SETTINGS_KEY = '@english_settings';

const getCurrentUid = () => auth.currentUser?.uid;

const defaultProgress = () => ({
  type1: { completed: false, correctCount: 0, totalCount: 0 },
  type3: { completed: false, correctCount: 0, totalCount: 0 },
  type4: { completed: false, correctCount: 0, totalCount: 0 },
  vocab: { completed: false, correctCount: 0, totalCount: 0 },
  reviewCount: 0,
});

// ── 지문 (사용자별 독립) ──────────────────────────────

export const getPassages = async () => {
  try {
    const uid = getCurrentUid();
    if (!uid) return [];
    const q = query(collection(db, 'users', uid, 'passages'), orderBy('order', 'asc'));
    const [passagesSnap, progressSnap] = await Promise.all([
      getDocs(q),
      getDocs(collection(db, 'progress', uid, 'passages')),
    ]);
    const progressMap = {};
    progressSnap.docs.forEach(d => { progressMap[d.id] = d.data(); });
    return passagesSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      progress: progressMap[d.id] || defaultProgress(),
    }));
  } catch (e) {
    console.error('getPassages error:', e);
    return [];
  }
};

export const savePassage = async (passage) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    const { progress, ...passageData } = passage;
    const ref = doc(db, 'users', uid, 'passages', passage.id);
    const existing = await getDoc(ref);
    const order = existing.exists() ? existing.data().order : -Date.now();
    await setDoc(ref, {
      ...passageData,
      order: passageData.order ?? order,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error('savePassage error:', e);
    return false;
  }
};

export const savePassages = async (passages) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    const batch = writeBatch(db);
    passages.forEach((p, index) => {
      batch.update(doc(db, 'users', uid, 'passages', p.id), { order: index });
    });
    await batch.commit();
    return true;
  } catch (e) {
    console.error('savePassages error:', e);
    return false;
  }
};

export const deletePassage = async (id) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    await deleteDoc(doc(db, 'users', uid, 'passages', id));
    return true;
  } catch (e) {
    console.error('deletePassage error:', e);
    return false;
  }
};

export const getPassageById = async (id) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return null;
    const [passageSnap, progressSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'passages', id)),
      getDoc(doc(db, 'progress', uid, 'passages', id)),
    ]);
    if (!passageSnap.exists()) return null;
    return {
      id: passageSnap.id,
      ...passageSnap.data(),
      progress: progressSnap.exists() ? progressSnap.data() : defaultProgress(),
    };
  } catch (e) {
    console.error('getPassageById error:', e);
    return null;
  }
};

export const updatePassageTitle = async (id, newTitle) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    await updateDoc(doc(db, 'users', uid, 'passages', id), { title: newTitle });
    return true;
  } catch (e) {
    console.error('updatePassageTitle error:', e);
    return false;
  }
};

// ── 진도율 (사용자별) ────────────────────────────────

export const updatePassageProgress = async (passageId, progressType, data) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    const ref = doc(db, 'progress', uid, 'passages', passageId);
    await setDoc(ref, { [progressType]: data }, { merge: true });
    return true;
  } catch (e) {
    console.error('updatePassageProgress error:', e);
    return false;
  }
};

export const incrementReviewCount = async (passageId) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    const ref = doc(db, 'progress', uid, 'passages', passageId);
    await setDoc(ref, { reviewCount: increment(1) }, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
};

// ── 폴더 (사용자별 독립) ─────────────────────────────

export const getFolders = async () => {
  try {
    const uid = getCurrentUid();
    if (!uid) return [];
    const q = query(collection(db, 'users', uid, 'folders'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getFolders error:', e);
    return [];
  }
};

export const saveFolders = async (folders) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    const batch = writeBatch(db);
    folders.forEach((f, index) => {
      batch.update(doc(db, 'users', uid, 'folders', f.id), { order: index });
    });
    await batch.commit();
    return true;
  } catch (e) {
    console.error('saveFolders error:', e);
    return false;
  }
};

export const createFolder = async (name) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return null;
    const folder = {
      id: `folder_${Date.now()}`,
      name,
      order: -Date.now(),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid, 'folders', folder.id), folder);
    return folder;
  } catch (e) {
    console.error('createFolder error:', e);
    return null;
  }
};

export const updateFolderName = async (id, name) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    await updateDoc(doc(db, 'users', uid, 'folders', id), { name });
    return true;
  } catch (e) {
    console.error('updateFolderName error:', e);
    return false;
  }
};

export const deleteFolder = async (id) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid, 'folders', id));
    const passagesSnap = await getDocs(
      query(collection(db, 'users', uid, 'passages'), where('folderId', '==', id))
    );
    passagesSnap.docs.forEach(d => batch.update(d.ref, { folderId: null }));
    await batch.commit();
    return true;
  } catch (e) {
    console.error('deleteFolder error:', e);
    return false;
  }
};

export const movePassageToFolder = async (passageId, folderId) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    await updateDoc(doc(db, 'users', uid, 'passages', passageId), { folderId: folderId || null });
    return true;
  } catch (e) {
    console.error('movePassageToFolder error:', e);
    return false;
  }
};

// ── 설정 (기기 로컬) ─────────────────────────────────

const DEFAULT_SETTINGS = { apiKey: '', aiProvider: 'gemini', groqApiKey: '' };

export const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('saveSettings error:', e);
    return false;
  }
};

// ── 데이터 초기화 ────────────────────────────────────

export const resetAllData = async () => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;
    const [passagesSnap, foldersSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'passages')),
      getDocs(collection(db, 'users', uid, 'folders')),
    ]);
    const batch = writeBatch(db);
    passagesSnap.docs.forEach(d => batch.delete(d.ref));
    foldersSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return true;
  } catch (e) {
    console.error('resetAllData error:', e);
    return false;
  }
};

// ── 공유 팩 ──────────────────────────────────────────

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

export const createSharedPack = async ({ title, passageIds, folderIds }) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return { success: false };

    // 선택된 지문 수집
    const passageSnaps = await Promise.all(
      passageIds.map(id => getDoc(doc(db, 'users', uid, 'passages', id)))
    );
    const passagesData = passageSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }));

    // 선택된 폴더 수집
    const folderSnaps = await Promise.all(
      folderIds.map(id => getDoc(doc(db, 'users', uid, 'folders', id)))
    );
    const foldersData = folderSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }));

    // 폴더에 속한 지문도 포함
    const folderPassageSnaps = folderIds.length > 0
      ? await Promise.all(
          folderIds.map(fid =>
            getDocs(query(collection(db, 'users', uid, 'passages'), where('folderId', '==', fid)))
          )
        )
      : [];
    const folderPassages = folderPassageSnaps.flatMap(snap =>
      snap.docs.map(d => ({ id: d.id, ...d.data() }))
    );

    // 중복 제거
    const allPassageIds = new Set(passagesData.map(p => p.id));
    const allPassages = [...passagesData];
    folderPassages.forEach(p => { if (!allPassageIds.has(p.id)) allPassages.push(p); });

    // 코드 생성 (중복 체크)
    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      const snap = await getDoc(doc(db, 'sharedPacks', code));
      exists = snap.exists();
    }

    await setDoc(doc(db, 'sharedPacks', code), {
      code,
      title,
      createdBy: uid,
      passages: allPassages,
      folders: foldersData,
      passageCount: allPassages.length,
      createdAt: serverTimestamp(),
    });

    return { success: true, code };
  } catch (e) {
    console.error('createSharedPack error:', e);
    return { success: false };
  }
};

export const getSharedPack = async (code) => {
  try {
    const snap = await getDoc(doc(db, 'sharedPacks', code.toUpperCase().trim()));
    if (!snap.exists()) return null;
    return snap.data();
  } catch (e) {
    console.error('getSharedPack error:', e);
    return null;
  }
};

export const importSharedPack = async (pack) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;

    // 폴더 먼저 생성
    const folderIdMap = {};
    for (const folder of pack.folders) {
      const newFolderId = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      folderIdMap[folder.id] = newFolderId;
      await setDoc(doc(db, 'users', uid, 'folders', newFolderId), {
        id: newFolderId,
        name: folder.name,
        order: -Date.now(),
        createdAt: serverTimestamp(),
      });
    }

    // 지문 복사
    const batch = writeBatch(db);
    pack.passages.forEach((p, index) => {
      const newId = `passage_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
      const newFolderId = p.folderId ? (folderIdMap[p.folderId] ?? null) : null;
      const { progress, id: _id, ...passageData } = p;
      batch.set(doc(db, 'users', uid, 'passages', newId), {
        ...passageData,
        id: newId,
        folderId: newFolderId,
        order: -Date.now() + index,
        importedFrom: pack.code,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return true;
  } catch (e) {
    console.error('importSharedPack error:', e);
    return false;
  }
};
