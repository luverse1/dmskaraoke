import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import styles from '../styles/Admin.module.css';

const AdminPage = () => {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [redirects, setRedirects] = useState([]);
  const [newSlug, setNewSlug] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const isAllowed = await checkAuthorization(user.email);
        setIsAuthorized(isAllowed);
        setIsLoading(false);
        if (isAllowed) {
          fetchRedirects();
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
    
    // 토큰 안에 관리자 여부 정보가 있는지 확인
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

  const fetchRedirects = async () => {
    const querySnapshot = await getDocs(collection(db, 'redirects'));
    const redirectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRedirects(redirectsList);
  };

const validateSlugAndUrl = (slug, url) => {
  const slugPattern = /^[a-zA-Z0-9-_]+$/;  // 슬러그는 알파벳, 숫자, 하이픈, 언더스코어만 허용
  const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/;  // 올바른 URL 형식인지 확인해버리기

  if (!slugPattern.test(slug)) {
    alert('슬러그는 알파벳, 숫자, 하이픈, 언더스코어만 포함할 수 있습니다.');
    return false;
  }

  if (!urlPattern.test(url)) {
    alert('유효한 URL을 입력하세요.');
    return false;
  }

  return true;
};

const addRedirect = async (e) => {
  e.preventDefault();
  
  if (!validateSlugAndUrl(newSlug, newUrl)) {
    return;
  }
  
  try {
    const querySnapshot = await getDocs(collection(db, 'redirects'));
    const redirectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const isSlugTaken = redirectsList.some(redirect => redirect.slug === newSlug);
    
    if (isSlugTaken) {
      alert('이 슬러그는 이미 사용 중입니다.');
      return;
    }
    
    await addDoc(collection(db, 'redirects'), { slug: newSlug, url: newUrl });
    setNewSlug('');
    setNewUrl('');
    fetchRedirects();
  } catch (error) {
    console.error('리다이렉트 추가 실패:', error);
  }
};

  const deleteRedirect = async (id) => {
    await deleteDoc(doc(db, 'redirects', id));
    fetchRedirects();
  };

  if (isLoading) {
    return (
      <main className="ghostwhite-bg">
        <div className={styles['admin-container']}>
          <div className={styles['admin-header']}>
            <h1 className={styles['admin-title']}>URL 관리</h1>
          </div>
          <form className={styles['add-redirect-form']}>
            <h3>로그인 정보 불러오는 중...</h3>
          </form>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="ghostwhite-bg">
        <div className={styles['admin-container']}>
          <div className={styles['admin-header']}>
            <h1 className={styles['admin-title']}>URL 관리</h1>
            <button className={styles['login-button']} onClick={signIn}>Google로 로그인</button>
          </div>
          <form className={styles['add-redirect-form']}>
            <h3>접근을 위해서는 관리자 권한이 필요합니다.</h3>
          </form>
        </div>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="ghostwhite-bg">
        <div className={styles['admin-container']}>
          <div className={styles['admin-header']}>
            <h1 className={styles['admin-title']}>URL 관리</h1>
            <button className={styles['logout-button']} onClick={handleSignOut}>로그아웃</button>
          </div>
          <form className={styles['add-redirect-form']}>
            <h3>권한이 없습니다.</h3>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="ghostwhite-bg">
      <div className={styles['admin-container']}>
        <div className={styles['admin-header']}>
          <h1 className={styles['admin-title']}>URL 관리</h1>
          <button className={styles['logout-button']} onClick={handleSignOut}>로그아웃</button>
        </div>
        <form className={styles['add-redirect-form']} onSubmit={addRedirect}>
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="슬러그"
            required
          />
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="리다이렉트 URL"
            required
          />
          <button type="submit" className={styles['add-button']}>추가</button>
        </form>
        <ul className={styles['redirects-list']}>
          {redirects.map((redirect) => (
            <li key={redirect.id} className={styles['redirect-item']}>
              <span>#{redirect.slug} -&gt; {redirect.url}</span>
              <button className={styles['delete-button']} onClick={() => deleteRedirect(redirect.id)}>삭제</button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};

export default AdminPage;
