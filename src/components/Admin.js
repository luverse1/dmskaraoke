import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import styles from '../styles/Admin.module.css';

const AdminPage = () => {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [songs, setSongs] = useState([]);
  const [newSong, setNewSong] = useState({
    Title: '',
    Artists: '',
    AlbumCover: '',
    SongId: '',
    Category: '',
    Lyrics: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSong, setEditedSong] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const isAllowed = await checkAuthorization(user.email);
        setIsAuthorized(isAllowed);
        setIsLoading(false);
        if (isAllowed) {
          fetchSongs();
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAuthorization = async (email) => {
    try {
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      const isAdmin = idTokenResult.claims.admin;

      if (isAdmin) {
        return true;
      }

      const settingsRef = doc(db, 'settings', 'allowedEmails');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const allowedEmails = settingsSnap.data().emails;
        return allowedEmails.includes(email);
      } else {
        console.warn('Settings document does not exist.');
        return false;
      }
    } catch (error) {
      console.error('Authorization check failed:', error);
      return false;
    }
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('로그인 실패:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const fetchSongs = async () => {
    const querySnapshot = await getDocs(collection(db, 'Songs'));
    const songsList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    songsList.forEach(song => {
      song.Lyrics = Object.entries(song.Lyrics)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
        .reduce((sortedLyrics, [time, text]) => {
          sortedLyrics[time] = text;
          return sortedLyrics;
        }, {});
    });
    setSongs(songsList);
  };

  const convertLRCToJSON = (lrcContent) => {
    const lines = lrcContent.split('\n');
    const lyrics = {};

    lines.forEach(line => {
      const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const time = (minutes * 60 + seconds).toFixed(2);
        const text = match[3].trim();
        lyrics[time] = text;
      }
    });

    return lyrics;
  };

  const convertJSONToLRC = (lyrics) => {
    let lrcContent = '';
    for (const [time, text] of Object.entries(lyrics)) {
      const minutes = Math.floor(time / 60);
      const seconds = (time % 60).toFixed(2);
      lrcContent += `[${minutes}:${seconds}]${text}\n`;
    }
    return lrcContent.trim();
  };

  const validateRobloxAsset = async (assetId) => {
    try {
      const response = await fetch(`https://corsproxy.io/?https://assetdelivery.roblox.com/v1/asset/?id=${assetId}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  };
  
  const validateRobloxAudio = async (audioId) => {
    try {
      const response = await fetch(`https://corsproxy.io/?https://assetdelivery.roblox.com/v1/asset/?id=${audioId}`);
      const responseData = await response.json();
      console.log(response.status)
      if (response.status === 403) {
        return true;
      }
      
      if (response.status !== 200) {
        console.error("Server error: ", responseData.errors || 'Unknown server error');
        return false;
      }
  
      return true;
    } catch (error) {
      console.error("Request failed:", error);
      return false;
    }
  };

  const validateLRCFormat = (lyrics) => {
    const lines = lyrics.split('\n');
    return lines.every(line => /\[\d+:\d+\.\d+\].*/.test(line));
  };
  
  const addSong = async (e) => {
    e.preventDefault();
  
    // AlbumCover 검증
    const isAlbumCoverValid = await validateRobloxAsset(newSong.AlbumCover);
    if (!isAlbumCoverValid) {
      alert("이미지 ID 가 잘못되었습니다. 올바른 로블록스 이미지 ID를 입력하세요.");
      return;
    }
  
    // SongId 검증
    const isSongValid = await validateRobloxAudio(newSong.SongId);
    if (!isSongValid) {
      alert("오디오 ID 가 잘못되었습니다. 올바른 로블록스 오디오 ID를 입력하세요.");
      return;
    }

    // LRC 형식 검증
    if (!validateLRCFormat(newSong.Lyrics)) {
      alert("가사는 LRC 형식이어야 합니다.");
      return;
    }
  
    try {
      const convertedLyrics = convertLRCToJSON(newSong.Lyrics);
      const categoriesArray = newSong.Category.split(',').map(cat => cat.trim());
      const newSongData = { ...newSong, Lyrics: convertedLyrics, Category: categoriesArray };
  
      await addDoc(collection(db, 'Songs'), newSongData);
      setNewSong({ Title: '', Artists: '', AlbumCover: '', SongId: '', Category: '', Lyrics: '' });
      fetchSongs();
    } catch (error) {
      console.error('노래 추가 실패:', error);
    }
  };

  const deleteSong = async (id) => {
    await deleteDoc(doc(db, 'Songs', id));
    fetchSongs();
  };

  const openSongDetails = (song) => {
    setSelectedSong(song);
    setIsEditing(false);
  };

  const closeSongDetails = () => {
    setSelectedSong(null);
    setIsEditing(false); 
  };

  const handleEdit = (song) => {
    setIsEditing(true);
    setEditedSong({ ...song, Lyrics: convertJSONToLRC(song.Lyrics) });
  };

  const saveEditedSong = async () => {
    if (!validateLRCFormat(editedSong.Lyrics)) {
      alert("가사는 LRC 형식이어야 합니다.");
      return;
    }
  
    try {
      const songRef = doc(db, 'Songs', editedSong.id);
      const convertedLyrics = convertLRCToJSON(editedSong.Lyrics);
  
      const { id, ...updatedSongData } = editedSong;
  
      await updateDoc(songRef, { ...updatedSongData, Lyrics: convertedLyrics });
  
      setIsEditing(false);
      setSelectedSong({ ...editedSong, Lyrics: convertedLyrics });
      fetchSongs();
    } catch (error) {
      console.error('노래 수정 실패:', error);
    }
  };
  

  if (isLoading) {
    return (
      <main className={styles['admin-container']}>
        <h3>로그인 정보 불러오는 중...</h3>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles['admin-container']}>
        <h1 className={styles['admin-title']}>대명중학교 노래방 관리</h1>
        <button className={styles['login-button']} onClick={signIn}>Google로 로그인</button>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className={styles['admin-container']}>
        <h1 className={styles['admin-title']}>대명중학교 노래방 관리</h1>
        <button className={styles['logout-button']} onClick={handleSignOut}>로그아웃</button>
        <h3>권한이 없습니다.</h3>
      </main>
    );
  }

  return (
    <>
      <main className={styles['admin-container']}>
        <div className={styles['admin-header']}>
          <h1 className={styles['admin-title']}>대명중학교 노래방 관리</h1>
          <button className={styles['logout-button']} onClick={handleSignOut}>로그아웃</button>
        </div>
        <form className={styles['add-redirect-form']} onSubmit={addSong}>
          <input
            type="text"
            value={newSong.Title}
            onChange={(e) => setNewSong({ ...newSong, Title: e.target.value })}
            placeholder="Title"
            required
          />
          <input
            type="text"
            value={newSong.Artists}
            onChange={(e) => setNewSong({ ...newSong, Artists: e.target.value })}
            placeholder="Artists"
            required
          />
          <input
            type="text"
            value={newSong.AlbumCover}
            onChange={(e) => setNewSong({ ...newSong, AlbumCover: e.target.value.replace(/\D/g, '') })}
            placeholder="AlbumCover"
            pattern="\d*"
            required
          />
          <input
            type="text"
            value={newSong.SongId}
            onChange={(e) => setNewSong({ ...newSong, SongId: e.target.value.replace(/\D/g, '') })}
            placeholder="SongId"
            pattern="\d*"
            required
          />
          <input
            type="text"
            value={newSong.Category}
            onChange={(e) => setNewSong({ ...newSong, Category: e.target.value })}
            placeholder="Category (쉼표로 구분)"
            required
          />
          <textarea
            type="text"
            value={newSong.Lyrics}
            onChange={(e) => setNewSong({ ...newSong, Lyrics: e.target.value })}
            placeholder='Lyrics (LRC 형식으로 입력)'
            required
          />
          <button type="submit" className={styles['add-button']}>추가</button>
        </form>
        <ul className={styles['redirects-list']}>
          {songs.map((song) => (
            <li key={song.id} className={styles['redirect-item']} onClick={() => openSongDetails(song)}>
              <span>{song.Title} - {song.Artists}</span>
              <button className={styles['delete-button']} onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }}>삭제</button>
            </li>
          ))}
        </ul>
      </main>
  
      {selectedSong && (
        <div className={`${styles['song-details-popup']} ${styles['show']}`}>
          <div className={styles['song-details-content']}>
            <h2>{selectedSong.Title}</h2>
            {isEditing ? (
              <>
                <p>
                  <strong>Title:</strong>
                  <input
                    type="text"
                    value={editedSong.Title}
                    onChange={(e) => setEditedSong({ ...editedSong, Title: e.target.value })}
                  />
                </p>
                <p>
                  <strong>Artists:</strong>
                  <input
                    type="text"
                    value={editedSong.Artists}
                    onChange={(e) => setEditedSong({ ...editedSong, Artists: e.target.value })}
                  />
                </p>
                <p>
                  <strong>AlbumCover:</strong>
                  <input
                    type="text"
                    value={editedSong.AlbumCover}
                    onChange={(e) => setEditedSong({ ...editedSong, AlbumCover: e.target.value.replace(/\D/g, '') })}
                    pattern="\d*"
                  />
                </p>
                <p>
                  <strong>SongId:</strong>
                  <input
                    type="text"
                    value={editedSong.SongId}
                    onChange={(e) => setEditedSong({ ...editedSong, SongId: e.target.value.replace(/\D/g, '') })}
                    pattern="\d*"
                  />
                </p>
                <p>
                  <strong>Category:</strong>
                  <input
                    type="text"
                    value={editedSong.Category.join(', ')}
                    onChange={(e) => setEditedSong({ ...editedSong, Category: e.target.value.split(',').map(cat => cat.trim()) })}
                  />
                </p>
                <p>
                  <strong>Lyrics:</strong>
                  <textarea
                    value={editedSong.Lyrics}
                    onChange={(e) => setEditedSong({ ...editedSong, Lyrics: e.target.value })}
                  />
                </p>
              </>
            ) : (
              <>
                <p><strong>Title:</strong> {selectedSong.Title}</p>
                <p><strong>Artists:</strong> {selectedSong.Artists}</p>
                <p><strong>AlbumCover:</strong> {selectedSong.AlbumCover}</p>
                <p><strong>SongId:</strong> {selectedSong.SongId}</p>
                <p><strong>Category:</strong> {selectedSong.Category.join(', ')}</p>
                <p><strong>Lyrics:</strong></p>
                <pre>{convertJSONToLRC(selectedSong.Lyrics)}</pre>
              </>
            )}
            <div className={styles['popup-buttons']}>
              {isEditing ? (
                <button onClick={saveEditedSong}>저장</button>
              ) : (
                <button onClick={() => handleEdit(selectedSong)}>편집</button>
              )}
              <button onClick={closeSongDetails}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPage;