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

// ── 지문 ──────────────────────────────────────────────

export const getPassages = async () => {
  try {
    const uid = getCurrentUid();
    const q = query(collection(db, 'passages'), orderBy('order', 'asc'));
    const [passagesSnap, progressSnap] = await Promise.all([
      getDocs(q),
      uid
        ? getDocs(collection(db, 'progress', uid, 'passages'))
        : Promise.resolve({ docs: [] }),
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
    const { progress, ...passageData } = passage;
    const ref = doc(db, 'passages', passage.id);
    const existing = await getDoc(ref);
    const order = existing.exists() ? existing.data().order : -Date.now();

    await setDoc(ref, {
      ...passageData,
      ownerId: uid,
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
    const batch = writeBatch(db);
    passages.forEach((p, index) => {
      batch.update(doc(db, 'passages', p.id), { order: index });
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
    await deleteDoc(doc(db, 'passages', id));
    return true;
  } catch (e) {
    console.error('deletePassage error:', e);
    return false;
  }
};

export const getPassageById = async (id) => {
  try {
    const uid = getCurrentUid();
    const [passageSnap, progressSnap] = await Promise.all([
      getDoc(doc(db, 'passages', id)),
      uid
        ? getDoc(doc(db, 'progress', uid, 'passages', id))
        : Promise.resolve({ exists: () => false, data: () => null }),
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
    await updateDoc(doc(db, 'passages', id), { title: newTitle });
    return true;
  } catch (e) {
    console.error('updatePassageTitle error:', e);
    return false;
  }
};

// ── 진도율 (사용자별 개별 저장) ──────────────────────

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

// ── 폴더 ──────────────────────────────────────────────

export const getFolders = async () => {
  try {
    const q = query(collection(db, 'folders'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getFolders error:', e);
    return [];
  }
};

export const saveFolders = async (folders) => {
  try {
    const batch = writeBatch(db);
    folders.forEach((f, index) => {
      batch.update(doc(db, 'folders', f.id), { order: index });
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
    const folder = {
      id: `folder_${Date.now()}`,
      name,
      ownerId: uid,
      order: -Date.now(),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'folders', folder.id), folder);
    return folder;
  } catch (e) {
    console.error('createFolder error:', e);
    return null;
  }
};

export const updateFolderName = async (id, name) => {
  try {
    await updateDoc(doc(db, 'folders', id), { name });
    return true;
  } catch (e) {
    console.error('updateFolderName error:', e);
    return false;
  }
};

export const deleteFolder = async (id) => {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'folders', id));
    const passagesSnap = await getDocs(
      query(collection(db, 'passages'), where('folderId', '==', id))
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
    await updateDoc(doc(db, 'passages', passageId), { folderId: folderId || null });
    return true;
  } catch (e) {
    console.error('movePassageToFolder error:', e);
    return false;
  }
};

// ── 설정 (API 키는 기기 로컬에 유지) ─────────────────

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

// ── 데이터 초기화 (관리자용) ─────────────────────────

export const resetAllData = async () => {
  try {
    const [passagesSnap, foldersSnap] = await Promise.all([
      getDocs(collection(db, 'passages')),
      getDocs(collection(db, 'folders')),
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

// 6자리 랜덤 대문자+숫자 코드 생성
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// 공유 팩 생성: 선택된 지문 id 목록 + 폴더 id 목록을 받아서 데이터 통째로 저장
export const createSharedPack = async ({ title, passageIds, folderIds }) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return { success: false };

    // 선택된 지문들 데이터 수집
    const passageSnaps = await Promise.all(
      passageIds.map(id => getDoc(doc(db, 'passages', id)))
    );
    const passagesData = passageSnaps
      .filter(s => s.exists())
      .map(s => ({ id: s.id, ...s.data() }));

    // 선택된 폴더들 데이터 수집
    const folderSnaps = await Promise.all(
      folderIds.map(id => getDoc(doc(db, 'folders', id)))
    );
    const foldersData = folderSnaps
      .filter(s => s.exists())
      .map(s => ({ id: s.id, ...s.data() }));

    // 폴더에 속한 지문도 포함
    const folderPassageSnaps = folderIds.length > 0
      ? await Promise.all(
          folderIds.map(fid =>
            getDocs(query(collection(db, 'passages'), where('folderId', '==', fid)))
          )
        )
      : [];
    const folderPassages = folderPassageSnaps.flatMap(snap =>
      snap.docs.map(d => ({ id: d.id, ...d.data() }))
    );

    // 중복 제거하여 전체 지문 합치기
    const allPassageIds = new Set(passagesData.map(p => p.id));
    const allPassages = [...passagesData];
    folderPassages.forEach(p => {
      if (!allPassageIds.has(p.id)) allPassages.push(p);
    });

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

// 공유 코드로 팩 조회
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

// 공유 팩 지문들을 내 계정으로 복사
export const importSharedPack = async (pack) => {
  try {
    const uid = getCurrentUid();
    if (!uid) return false;

    // 폴더 먼저 생성 (id 매핑 테이블)
    const folderIdMap = {};
    for (const folder of pack.folders) {
      const newFolderId = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      folderIdMap[folder.id] = newFolderId;
      await setDoc(doc(db, 'folders', newFolderId), {
        id: newFolderId,
        name: folder.name,
        ownerId: uid,
        order: -Date.now(),
        createdAt: serverTimestamp(),
      });
    }

    // 지문 복사 (폴더 id 매핑 적용)
    const batch = writeBatch(db);
    pack.passages.forEach((p, index) => {
      const newId = `passage_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
      const newFolderId = p.folderId ? (folderIdMap[p.folderId] ?? null) : null;
      const { progress, id: _id, ...passageData } = p;
      batch.set(doc(db, 'passages', newId), {
        ...passageData,
        id: newId,
        folderId: newFolderId,
        ownerId: uid,
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
