import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import styles from '../styles/Redirect.module.css';
import logo from '../assets/img/favicon.png';

const Redirect = () => {
  const { slug } = useParams();
  const location = useLocation();
  const [countdown, setCountdown] = useState(3);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [error, setError] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const fetchRedirectUrl = async () => {
      try {
        let currentSlug = slug;

        if (location.pathname === '/') {
          currentSlug = 'main';
        }

        const q = query(collection(db, 'redirects'), where('slug', '==', currentSlug));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setRedirectUrl(docSnap.data().url);
        } else {
          setError('요청하신 URL이 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('Error fetching redirect URL:', error);
        setError('URL 정보를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchRedirectUrl();
  }, [slug, location.pathname]);

  useEffect(() => {
    if (isDataLoaded && redirectUrl && countdown <= 0) {
      window.location.href = redirectUrl;
    }
  }, [isDataLoaded, redirectUrl, countdown]);

  useEffect(() => {
    if (isDataLoaded && !error) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isDataLoaded, error]);

  if (!isDataLoaded) {
    return null;
  }

  if (error) {
    return (
      <main className="b8b986-bg">
        <div className={`${styles['redirect-container']} ${styles.error}`}>
          <img src={logo} alt="Jokga School Alpha" className={styles.logo_img} />
          <h1>{error}</h1>
          <h3>© 2024 Louis1618, All rights reserved</h3>
        </div>
      </main>
    );
  }

  return (
    <main className="b8b986-bg">
      <div className={styles['redirect-container']}>
        <img src={logo} alt="Jokga School Alpha" className={styles.logo_img} />
        <h1>잠시 후 요청하신 URL로 이동합니다.</h1>
        <div className={styles['progress-bar-container']}>
          <div className={styles['progress-bar']} style={{ width: `${(3 - countdown) / 3 * 100}%` }}></div>
        </div>
      </div>
    </main>
  );
};

export default Redirect;