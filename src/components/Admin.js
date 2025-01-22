import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
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

  const addSong = async (e) => {
    e.preventDefault();
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
  };

  const closeSongDetails = () => {
    setSelectedSong(null);
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
        <h1 className={styles['admin-title']}>DMS Karaoke Music Manager</h1>
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
          onChange={(e) => setNewSong({ ...newSong, AlbumCover: e.target.value })}
          placeholder="AlbumCover"
          required
        />
        <input
          type="text"
          value={newSong.SongId}
          onChange={(e) => setNewSong({ ...newSong, SongId: e.target.value })}
          placeholder="SongId"
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
      {selectedSong && (
        <div className={styles['song-details-popup']}>
          <div className={styles['song-details-content']}>
            <h2>{selectedSong.Title}</h2>
            <p><strong>Title:</strong> {selectedSong.Title}</p>
            <p><strong>Artists:</strong> {selectedSong.Artists}</p>
            <p><strong>AlbumCover:</strong> {selectedSong.AlbumCover}</p>
            <p><strong>SongId:</strong> {selectedSong.SongId}</p>
            <p><strong>Category:</strong> {selectedSong.Category.join(', ')}</p>
            <p><strong>Lyrics:</strong></p>
            <pre>{JSON.stringify(selectedSong.Lyrics, null, 2)}</pre>
            <button onClick={closeSongDetails}>닫기</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminPage;

