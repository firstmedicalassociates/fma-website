"use client";

import { useRef } from "react";
import styles from "../page.module.css";

export default function WelcomeVideoDialog({ poster, source }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const pause = () => videoRef.current?.pause();
  return (
    <dialog
      ref={dialogRef}
      id="welcome-video-lightbox"
      className={styles.videoLightbox}
      aria-labelledby="welcome-video-lightbox-title"
      onClose={pause}
      onCancel={pause}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current.close(); }}
    >
      <div className={styles.videoLightboxPanel}>
        <div className={styles.videoLightboxHeader}>
          <h3 id="welcome-video-lightbox-title" className={styles.videoLightboxTitle}>Welcome Video</h3>
          <button type="button" className={styles.videoLightboxClose} aria-label="Close welcome video" onClick={() => dialogRef.current.close()}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className={styles.videoLightboxCloseIcon}><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className={styles.videoLightboxFrame}>
          <video ref={videoRef} className={styles.videoPlayer} controls playsInline preload="none" poster={poster}>
            <source src={source} type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>
        </div>
      </div>
    </dialog>
  );
}
