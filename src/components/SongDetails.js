import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const SongDetails = () => {
  const { id } = useParams(); // URL에서 ID 가져오기
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSong = async () => {
      const apiUrl = `https://firestore.googleapis.com/v1/projects/roblox-dms-karaoke-system/databases/(default)/documents/Songs/${id}`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Error fetching song: ${response.status}`);
        }
        const data = await response.json();

        // Firestore 데이터 변환
        const formattedSong = {
          id: data.name.split("/").pop(),
          title: data.fields.Title.stringValue,
          artists: data.fields.Artists.stringValue,
          category: data.fields.Category.arrayValue.values.map((item) => item.stringValue),
          lyrics: Object.entries(data.fields.Lyrics.mapValue.fields)
            .map(([time, text]) => ({
              time: parseFloat(time),
              text: text.stringValue,
            }))
            .sort((a, b) => a.time - b.time), // 시간 순서로 정렬
        };

        setSong(formattedSong);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!song) return <p>Song not found.</p>;

  return (
    <div>
      <h1>{song.title}</h1>
      <p><strong>Artists:</strong> {song.artists}</p>
      <p><strong>Category:</strong> {song.category.join(", ")}</p>
      <div>
        <h3>Lyrics:</h3>
        <ul>
          {song.lyrics.map((lyric, index) => (
            <li key={index}>
              <strong>{lyric.time.toFixed(2)}:</strong> {lyric.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SongDetails;
