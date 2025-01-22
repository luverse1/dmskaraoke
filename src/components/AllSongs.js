import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AllSongs = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSongs = async () => {
      const apiUrl = `https://firestore.googleapis.com/v1/projects/roblox-dms-karaoke-system/databases/(default)/documents/Songs`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Error fetching songs: ${response.status}`);
        }
        const data = await response.json();

        // Firestore 데이터 변환
        const formattedSongs = data.documents.map((doc) => ({
          id: doc.name.split("/").pop(),
          ...doc.fields,
        }));

        setSongs(formattedSongs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>노래 리스트 | Song Lists</h1>
      <ul>
        {songs.map((song) => (
          <li key={song.id} onClick={() => navigate(`/songs/${song.id}`)}>
            <h3>{song.Title.stringValue} - {song.Artists.stringValue}</h3>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AllSongs;
