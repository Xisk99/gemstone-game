'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';

interface GameObject {
  id: number;
  x: number;
  y: number;
  type: 'gem' | 'rock' | 'life';
}

interface Character {
  id: string;
  name: string;
  imageUrl: string;
}

interface GameState {
  score: number;
  lives: number;
  isPlaying: boolean;
  isPaused: boolean;
  gameOver: boolean;
  showHowToPlay: boolean;
}

const MiningRushGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    showHowToPlay: true,
  });

  const [playerX, setPlayerX] = useState(50); // Posición del jugador (porcentaje)
  const [playerDirection, setPlayerDirection] = useState<'left' | 'right'>('right'); // Dirección del personaje
  const [playerVelocity, setPlayerVelocity] = useState(0); // Velocidad actual del jugador
  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [touchTarget, setTouchTarget] = useState<number | null>(null); // Posición objetivo del toque
  const [mobileControls, setMobileControls] = useState<{ left: boolean; right: boolean }>({ left: false, right: false }); // Controles móviles
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [selectedCharacter, setSelectedCharacter] = useState<Character>({ 
    id: 'xisk', 
    name: 'XISK', 
    imageUrl: '/game/xisk.png' 
  });
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const spawnTimerRef = useRef<number | undefined>(undefined);
  const lifeSpawnTimerRef = useRef<number | undefined>(undefined);
  const objectIdRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const processedCollisionsRef = useRef<Set<number>>(new Set()); // Track processed collisions
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detectar si es dispositivo móvil
  const isMobile = typeof window !== 'undefined' && (
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );

  // Generate character list: XISK + 250 NFTs
  const generateCharacterList = (): Character[] => {
    const baseUrl = "https://gateway.pinit.io/cdn-cgi/image/format=auto/https://na-assets.pinit.io/HfqcAE9Za88tX3kpNYU3bNfST9cssNK7KBMgTEgnkXVd/a4f3b1e9-17de-4789-98c6-3007ce15db79/";
    
    const characters: Character[] = [
      {
        id: 'xisk',
        name: 'XISK',
        imageUrl: '/game/xisk.png'
      }
    ];

    // Add 250 NFT characters (0-249)
    for (let i = 0; i < 250; i++) {
      characters.push({
        id: `nft-${i}`,
        name: `GEMtard #${i}`,
        imageUrl: `${baseUrl}${i}`
      });
    }

    return characters;
  };

  const characters = generateCharacterList();

  // Función para mostrar toast
  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 2000);
  };

  // Actualizar la referencia del gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Limpiar colisiones procesadas y controles móviles cuando inicia un nuevo juego
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      processedCollisionsRef.current.clear();
    } else {
      // Limpiar controles móviles cuando no está jugando o está pausado
      setMobileControls({ left: false, right: false });
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  // Generar imagen épica de puntaje
  const generateScoreImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Configurar canvas
    canvas.width = 800;
    canvas.height = 600;

    // Fondo con gradiente épico
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Efectos de partículas/estrellas de fondo
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Función para cargar imagen con manejo de errores
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          // Si falla cargar NFT, usar XISK como fallback
          if (src !== '/game/xisk.png') {
            loadImage('/game/xisk.png').then(resolve).catch(reject);
          } else {
            reject(new Error('Failed to load fallback image'));
          }
        };
        img.src = src;
      });
    };

    try {
      // Cargar imágenes en paralelo
      const [gemImg, characterImg] = await Promise.all([
        loadImage('/game/gem_logo.png'),
        loadImage(selectedCharacter.imageUrl)
      ]);

      return new Promise<string>((resolve) => {
        // Dibujar gema más pequeña en la parte superior
        const gemSize = 100;
        ctx.drawImage(gemImg, (canvas.width - gemSize) / 2, 60, gemSize, gemSize);

        // Título del juego
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GEMSTONE MINING RUSH', canvas.width / 2, 200);

        // Puntaje épico
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 64px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 4;
        ctx.strokeText(gameState.score.toString(), canvas.width / 2, 280);
        ctx.fillText(gameState.score.toString(), canvas.width / 2, 280);

        // Texto "GEMS MINED"
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 24px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('GEMS MINED', canvas.width / 2, 310);

        // Character section
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`I played with ${selectedCharacter.name}`, canvas.width / 2, 360);

        // Dibujar character image con borde circular
        const characterSize = 80;
        const characterX = canvas.width / 2;
        const characterY = 420;
        
        // Crear círculo de recorte para el personaje
        ctx.save();
        ctx.beginPath();
        ctx.arc(characterX, characterY, characterSize / 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Dibujar imagen del personaje
        ctx.drawImage(
          characterImg, 
          characterX - characterSize / 2, 
          characterY - characterSize / 2, 
          characterSize, 
          characterSize
        );
        ctx.restore();

        // Borde púrpura alrededor del personaje
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(characterX, characterY, characterSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Footer épico
        ctx.fillStyle = '#888888';
        ctx.font = '20px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('Earn passive USDC rewards by holding $GEM in your wallet!', canvas.width / 2, 520);
        ctx.fillText('#GemstoneRewards #Solana', canvas.width / 2, 550);

        // Convertir a blob y crear URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setShareImageUrl(url);
            resolve(url);
          }
        }, 'image/png');
      });
    } catch (error) {
      console.error('Error loading images:', error);
      return null;
    }
  }, [gameState.score, selectedCharacter]);

  // Generar imagen cuando termina el juego
  useEffect(() => {
    if (gameState.gameOver && gameState.score > 0) {
      generateScoreImage();
    }
  }, [gameState.gameOver, generateScoreImage]);

  // Compartir imagen en Twitter
  const shareScoreImage = async () => {
    // Track social share event
    track('social_share', {
      platform: 'twitter',
      score: gameState.score,
      timestamp: new Date().toISOString(),
    });

    const currentUrl = window.location.href;
    const text = `Just mined ${gameState.score} gems in Gemstone Mining Rush! 💎⛏️

🎮 Play here: ${currentUrl}

🚀 Buy $GEM token: sxv1symoD4WXjpeXCs5USFEyt8hBhmCuuptLjA8uRNy

Follow and support @GemstoneReward for updates! ✨
#GemstoneRewards #Solana`;
    
    if (shareImageUrl) {
      try {
        const response = await fetch(shareImageUrl);
        const blob = await response.blob();
        
        // Detectar dispositivo móvil
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;
        
        // En Android moderno, intentar Web Share API primero
        if (isAndroid && navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], 'mining-rush-score.png', { type: 'image/png' });
            const shareData = {
              title: 'My Gemstone Mining Rush Score',
              text: text,
              files: [file]
            };
            
            if (navigator.canShare(shareData)) {
              await navigator.share(shareData);
              showToast('🎉 Shared successfully! Choose X from the options.');
              return;
            }
          } catch (shareError) {
            console.log('Native share failed, trying other methods');
          }
        }
        
        // Intentar copiar al clipboard y abrir X
        if (!isIOS && navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            
            // Abrir X según la plataforma
            if (isAndroid) {
              // En Android, usar intents y esquemas de URL específicos
              const twitterIntentUrl = `intent://tweet?text=${encodeURIComponent(text)}#Intent;scheme=https;package=com.twitter.android;S.browser_fallback_url=https://twitter.com/intent/tweet?text=${encodeURIComponent(text)};end`;
              const twitterAppUrl = `twitter://post?message=${encodeURIComponent(text)}`;
              const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
              
              // Intentar múltiples métodos en Android
              try {
                // Método 1: Intent URL (más robusto en Android)
                window.location.href = twitterIntentUrl;
                showToast('🎉 Image copied! Opening X app to post...');
              } catch (intentError) {
                try {
                  // Método 2: Twitter scheme URL
                  window.location.href = twitterAppUrl;
                  setTimeout(() => {
                    window.open(twitterWebUrl, '_blank');
                  }, 1500);
                  showToast('🎉 Image copied! Opening X app...');
                } catch (schemeError) {
                  // Método 3: Fallback web
                  window.open(twitterWebUrl, '_blank');
                  showToast('🎉 Image copied! Paste it in X (hold to paste)');
                }
              }
            } else {
              // Desktop
              const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
              window.open(twitterWebUrl, '_blank');
              showToast('🎉 Image copied! Paste it in X (Ctrl+V or Cmd+V)');
            }
            return;
          } catch (clipboardError) {
            console.log('Clipboard failed, using download method');
          }
        }
        
        // Para iOS o si clipboard falla
        if (isMobile) {
          // Abrir imagen en nueva pestaña para guardar
          window.open(shareImageUrl, '_blank');
          
          if (isAndroid) {
            // Android: usar intent URL más robusto
            const twitterIntentUrl = `intent://tweet?text=${encodeURIComponent(text)}#Intent;scheme=https;package=com.twitter.android;S.browser_fallback_url=https://twitter.com/intent/tweet?text=${encodeURIComponent(text)};end`;
            
            setTimeout(() => {
              try {
                window.location.href = twitterIntentUrl;
              } catch (error) {
                const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                window.open(twitterWebUrl, '_blank');
              }
            }, 1000);
            
            showToast('📱 Image opened! Download it, then opening X app...');
          } else {
            // iOS: usar esquema tradicional
            const twitterAppUrl = `twitter://post?message=${encodeURIComponent(text)}`;
            window.location.href = twitterAppUrl;
            
            // Fallback a web para iOS
            setTimeout(() => {
              const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
              window.open(twitterWebUrl, '_blank');
            }, 1500);
            
            showToast('📱 Image opened! Save it, then paste in X app');
          }
        } else {
          // Desktop fallback
          downloadScoreImage();
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
          window.open(twitterUrl, '_blank');
          showToast('🎉 Image downloaded! Drag it to your X tweet window.');
        }
        
      } catch (error) {
        console.error('Error sharing image:', error);
        // Fallback final: solo texto en X
        const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterWebUrl, '_blank');
      }
    } else {
      // Si no hay imagen, ir directo a X
      const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(twitterWebUrl, '_blank');
    }
  };

  // Copiar imagen al clipboard (opción adicional)
  const copyImageToClipboard = async () => {
    if (!shareImageUrl) return;
    
    // Track image copy event
    track('image_action', {
      action: 'copy',
      score: gameState.score,
      timestamp: new Date().toISOString(),
    });
    
    // Detectar dispositivo
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      // En iOS, abrir la imagen en nueva pestaña
      window.open(shareImageUrl, '_blank');
      showToast('📱 Image opened! Hold and select "Save to Photos"');
      return;
    }
    
    if (isAndroid) {
      // En Android, intentar clipboard primero, luego download
      try {
        const response = await fetch(shareImageUrl);
        const blob = await response.blob();
        
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          showToast('🎉 Image copied! Hold to paste in any app.');
        } else {
          // Fallback: abrir para descargar
          window.open(shareImageUrl, '_blank');
          showToast('📱 Image opened! Tap download button to save.');
        }
      } catch (error) {
        window.open(shareImageUrl, '_blank');
        showToast('📱 Image opened! Tap download to save.');
      }
      return;
    }
    
    // Desktop
    try {
      const response = await fetch(shareImageUrl);
      const blob = await response.blob();
      
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ]);
        showToast('🎉 Image copied to clipboard! You can now paste it anywhere.');
      } else {
        window.open(shareImageUrl, '_blank');
        showToast('📥 Image opened in new tab! Right-click to save or copy.');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      window.open(shareImageUrl, '_blank');
      showToast('📥 Image opened in new tab! Right-click to save or copy.');
    }
  };

  // Descargar imagen
  const downloadScoreImage = () => {
    if (!shareImageUrl) return;
    
    // Track image download event
    track('image_action', {
      action: 'download',
      score: gameState.score,
      timestamp: new Date().toISOString(),
    });
    
    // Detectar dispositivo
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    
    if (isMobile) {
      // En móviles, abrir la imagen en nueva pestaña
      window.open(shareImageUrl, '_blank');
      
      if (isIOS) {
        showToast('📱 Image opened! Hold the image and select "Save to Photos"');
      } else {
        showToast('📱 Image opened! Tap the download button to save');
      }
    } else {
      // En desktop, usar descarga tradicional
      const link = document.createElement('a');
      link.download = `mining-rush-score-${gameState.score}.png`;
      link.href = shareImageUrl;
      link.click();
      showToast('💾 Image downloaded!');
    }
  };

  // Configuración del juego
  const GAME_SPEED = 0.5;
  const SPAWN_RATE = 500; // ms between spawns (reduced from 1500 to 800)
  const LIFE_SPAWN_RATE = 15000; // ms between life spawns (every 15 seconds)
  const MAX_PLAYER_SPEED = 1.5; // Maximum speed
  const ACCELERATION = 0.025; // Acceleration
  const FRICTION = 0.25; // Friction for deceleration

  // Pausar/reanudar
  const togglePause = useCallback(() => {
    if (!gameState.isPlaying) return;
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, [gameState.isPlaying]);

  // Manejo de teclas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: true }));
      
      if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePause]);

  // Movimiento del jugador optimizado con requestAnimationFrame
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    let animationId: number;

    const movePlayer = () => {
      setPlayerVelocity(prevVelocity => {
        let newVelocity = prevVelocity;
        
        // Aplicar aceleración basada en las teclas presionadas, controles móviles o objetivo táctil
        if (keys['ArrowLeft'] || keys['a'] || keys['A'] || mobileControls.left) {
          newVelocity -= ACCELERATION;
          setPlayerDirection('left');
          setTouchTarget(null); // Limpiar objetivo al usar controles
        } else if (keys['ArrowRight'] || keys['d'] || keys['D'] || mobileControls.right) {
          newVelocity += ACCELERATION;
          setPlayerDirection('right');
          setTouchTarget(null); // Limpiar objetivo al usar controles
        } else if (!isMobile && touchTarget !== null) {
          // Movimiento hacia objetivo táctil (solo desktop)
          const diff = touchTarget - playerX;
          if (Math.abs(diff) > 0.5) { // Umbral para llegar al objetivo
            const targetVelocity = Math.sign(diff) * MAX_PLAYER_SPEED * 0.8;
            newVelocity = targetVelocity;
            setPlayerDirection(diff < 0 ? 'left' : 'right');
          } else {
            // Llegamos al objetivo
            setTouchTarget(null);
            newVelocity *= FRICTION;
          }
        } else {
          // Aplicar fricción cuando no hay input
          newVelocity *= FRICTION;
        }

        // Limitar la velocidad máxima
        newVelocity = Math.max(-MAX_PLAYER_SPEED, Math.min(MAX_PLAYER_SPEED, newVelocity));
        
        // Si la velocidad es muy pequeña, establecerla a 0
        if (Math.abs(newVelocity) < 0.01) {
          newVelocity = 0;
        }

        return newVelocity;
      });

      // Actualizar posición basada en la velocidad
      setPlayerX(prev => {
        const newX = prev + playerVelocity;
        return Math.max(0, Math.min(100, newX));
      });

      // Continuar el loop de animación
      if (gameStateRef.current.isPlaying && !gameStateRef.current.isPaused) {
        animationId = requestAnimationFrame(movePlayer);
      }
    };

    animationId = requestAnimationFrame(movePlayer);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [keys, gameState.isPlaying, gameState.isPaused, playerVelocity, touchTarget, mobileControls, isMobile]);

  // Spawn de objetos
  const spawnObject = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState.isPlaying || currentGameState.isPaused) return;

    // Adjust probabilities: 70% gems, 30% rocks
    const random = Math.random();
    const type = random < 0.7 ? 'gem' : 'rock';
    
    const newObject: GameObject = {
      id: objectIdRef.current++,
      x: Math.random() * 90 + 5, // 5% a 95% del ancho
      y: -10,
      type,
    };

    setGameObjects(prev => [...prev, newObject]);
  }, []); // Sin dependencias para evitar recreación

  // Spawn de vidas
  const spawnLife = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState.isPlaying || currentGameState.isPaused) return;

    const newLife: GameObject = {
      id: objectIdRef.current++,
      x: Math.random() * 90 + 5,
      y: -10,
      type: 'life',
    };

    setGameObjects(prev => [...prev, newLife]);
  }, []); // Sin dependencias para evitar recreación

  // Loop principal del juego optimizado
  const gameLoop = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState.isPlaying || currentGameState.isPaused) return;

    setGameObjects(prev => {
      const updatedObjects = prev
        .map(obj => ({ ...obj, y: obj.y + GAME_SPEED }))
        .filter(obj => obj.y < 110); // Remover objetos que salen de pantalla

      // Remover objetos que ya fueron procesados (collision cleanup)
      const cleanedObjects = updatedObjects.filter(obj => !processedCollisionsRef.current.has(obj.id));

      // Detección de colisiones más precisa
      const playerSize = 5; // Ajustado para el nuevo tamaño del jugador
      const collisions = cleanedObjects.filter(obj => {
        const objSize = obj.type === 'rock' ? 2.5 : 3; // Tamaño diferente para rocas
        return (
          obj.y > 88 && obj.y < 92 && // Rango Y estrecho y preciso
          obj.x > playerX - objSize && obj.x < playerX + playerSize && // Superposición horizontal
          Math.abs(obj.x - playerX) < (playerSize + objSize) / 2 // Verificación de distancia
        );
      });

      // Procesar solo la primera colisión para evitar duplicados
      if (collisions.length > 0) {
        const collision = collisions[0]; // Solo procesar la primera
        
        // Marcar como procesada INMEDIATAMENTE
        processedCollisionsRef.current.add(collision.id);
        
        // Procesar el efecto de la colisión
        if (collision.type === 'gem') {
          setGameState(prev => ({ ...prev, score: prev.score + 1 }));
        } else if (collision.type === 'rock') {
          setGameState(prev => {
            const newLives = Math.max(0, prev.lives - 1);
            const isGameOver = newLives === 0;
            
            // Track game over event
            if (isGameOver) {
              track('game_over', {
                final_score: prev.score,
                lives_lost: prev.lives,
                timestamp: new Date().toISOString(),
              });
            }
            
            return {
              ...prev,
              lives: newLives,
              gameOver: isGameOver,
              isPlaying: newLives > 0,
            };
          });
        } else if (collision.type === 'life') {
          setGameState(prev => ({ ...prev, lives: prev.lives + 1 }));
        }

        // Retornar sin el objeto que colisionó
        return cleanedObjects.filter(obj => obj.id !== collision.id);
      }

      return cleanedObjects;
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.isPlaying, gameState.isPaused, playerX]);

  // Iniciar/reiniciar juego
  const startGame = () => {
    // Track game start event
    track('game_start', {
      timestamp: new Date().toISOString(),
    });

    setGameState({
      score: 0,
      lives: 3,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      showHowToPlay: false,
    });
    setPlayerX(50);
    setPlayerDirection('right');
    setPlayerVelocity(0); // Resetear velocidad
    setGameObjects([]);
    setMobileControls({ left: false, right: false }); // Limpiar controles móviles
    setTouchTarget(null); // Limpiar objetivo táctil
    objectIdRef.current = 0;
    processedCollisionsRef.current.clear(); // Limpiar colisiones procesadas
  };

  // Efectos del juego - Game Loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameLoop]);

  // Efectos del juego - Spawn Timers (separados para evitar recreación constante)
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      spawnTimerRef.current = window.setInterval(spawnObject, SPAWN_RATE);
      lifeSpawnTimerRef.current = window.setInterval(spawnLife, LIFE_SPAWN_RATE);
    }

    return () => {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
      }
      if (lifeSpawnTimerRef.current) {
        clearInterval(lifeSpawnTimerRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, spawnObject, spawnLife]); // Ahora incluimos las funciones optimizadas

  // Manejo táctil para móviles altamente responsivo con tap instantáneo
  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    e.preventDefault(); // Prevenir scroll y otros comportamientos por defecto
    
    const touch = e.touches[0];
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const touchX = ((touch.clientX - rect.left) / rect.width) * 100;
      const targetX = Math.max(0, Math.min(100, touchX - 5)); // Centrar el jugador
      
      // Calcular la diferencia para determinar dirección y velocidad deseada
      const diff = targetX - playerX;
      
      if (Math.abs(diff) > 0.3) { // Umbral más bajo para mayor sensibilidad
        // Determinar dirección
        if (diff < 0) {
          setPlayerDirection('left');
        } else {
          setPlayerDirection('right');
        }
        
        // Sistema de velocidad más agresivo para móvil con objetivo persistente
        const distance = Math.abs(diff);
        let velocityMultiplier;
        
        if (distance > 25) {
          // Movimiento muy largo: velocidad máxima instantánea
          velocityMultiplier = 1.2; // 120% de velocidad máxima
        } else if (distance > 15) {
          // Movimiento largo: velocidad máxima inmediata
          velocityMultiplier = 1.0;
        } else if (distance > 8) {
          // Movimiento medio: velocidad alta
          velocityMultiplier = 0.85;
        } else if (distance > 3) {
          // Movimiento corto: velocidad moderada-alta
          velocityMultiplier = 0.7;
        } else {
          // Movimiento muy corto: velocidad moderada
          velocityMultiplier = 0.5;
        }
        
        const desiredVelocity = Math.sign(diff) * Math.min(MAX_PLAYER_SPEED * 1.2, MAX_PLAYER_SPEED * velocityMultiplier);
        setPlayerVelocity(desiredVelocity);
        
        // Establecer objetivo para movimiento continuo
        setTouchTarget(targetX);
      }
    }
  }, [gameState.isPlaying, gameState.isPaused, playerX]);

  // Manejar fin del toque para limpiar objetivo
  const handleTouchEnd = useCallback(() => {
    setTouchTarget(null); // Limpiar objetivo al levantar el dedo
  }, []);

  // Manejo de controles móviles
  const handleMobileButtonStart = useCallback((direction: 'left' | 'right') => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    setMobileControls(prev => ({ ...prev, [direction]: true }));
  }, [gameState.isPlaying, gameState.isPaused]);

  const handleMobileButtonEnd = useCallback((direction: 'left' | 'right') => {
    setMobileControls(prev => ({ ...prev, [direction]: false }));
  }, []);

  return (
    <div className="w-full flex flex-col bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 overflow-hidden fixed inset-0" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="bg-black/20 flex-shrink-0">
        {isMobile ? (
          // Mobile: 2-row layout
          <div className="p-2 space-y-2">
            {/* First Row: Logo + Title + Buy Button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 flex-1">
                <Image src="/game/gem_logo.png" alt="Gem Logo" width={28} height={28} />
                <h1 className="text-white text-sm font-bold tracking-tight">Gemstone Mining Rush</h1>
              </div>
              <button
                onClick={() => {
                  track('buy_gem_clicked', {
                    timestamp: new Date().toISOString(),
                    source: 'header_button'
                  });
                  window.open('https://axiom.trade/meme/4HBf4XHbkTDA9rgDjvKAowQ1aK9hjvi9Fi3TviG2mPXe', '_blank');
                }}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black px-2 py-1 rounded-lg font-bold text-xs transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-yellow-400"
              >
                💎 Buy $GEM
              </button>
            </div>
            
            {/* Second Row: Score + Lives + Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-white text-xs font-medium">
                  Score: <span className="font-bold text-purple-300">{gameState.score}</span>
                </div>
                <div className="text-white text-xs font-medium">
                  Lives: <span className="font-bold text-red-300">{"❤️".repeat(Math.max(0, gameState.lives))}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Pause game if it's playing
                    if (gameState.isPlaying && !gameState.isPaused) {
                      setGameState(prev => ({ ...prev, isPaused: true }));
                    }
                    setShowCharacterSelection(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded-lg transition-colors text-xs font-semibold"
                  title="Change Character"
                >
                  Change Character
                </button>
                <button
                  onClick={() => {
                    track('how_to_play_opened', {
                      timestamp: new Date().toISOString(),
                    });
                    setGameState(prev => ({ ...prev, showHowToPlay: true }));
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs font-semibold"
                >
                  ?
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Desktop: single-row layout (unchanged)
          <div className="flex justify-between items-center p-4">
            {/* Left section */}
            <div className="flex items-center gap-4 flex-1">
              <Image src="/game/gem_logo.png" alt="Gem Logo" width={40} height={40} />
              <h1 className="text-white text-xl font-bold tracking-tight">Gemstone Mining Rush</h1>
            </div>
            
            {/* Center section - Buy GEM Button */}
            <div className="flex-shrink-0 cursor-pointer">
              <button
                onClick={() => {
                  track('buy_gem_clicked', {
                    timestamp: new Date().toISOString(),
                    source: 'header_button'
                  });
                  window.open('https://axiom.trade/meme/4HBf4XHbkTDA9rgDjvKAowQ1aK9hjvi9Fi3TviG2mPXe', '_blank');
                }}
                className="bg-gradient-to-r cursor-pointer from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-yellow-400"
              >
                💎 Buy $GEM
              </button>
            </div>
            
            {/* Right section */}
            <div className="flex items-center gap-4 justify-end flex-1">
              <div className="text-white text-sm font-medium">
                Score: <span className="font-bold text-purple-300">{gameState.score}</span>
              </div>
              <div className="text-white text-sm font-medium">
                Lives: <span className="font-bold text-red-300">{"❤️".repeat(Math.max(0, gameState.lives))}</span>
              </div>
              <button
                onClick={() => {
                  // Pause game if it's playing
                  if (gameState.isPlaying && !gameState.isPaused) {
                    setGameState(prev => ({ ...prev, isPaused: true }));
                  }
                  setShowCharacterSelection(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
                title="Change Character"
              >
                Change Character
              </button>
              <button
                onClick={() => {
                  track('how_to_play_opened', {
                    timestamp: new Date().toISOString(),
                  });
                  setGameState(prev => ({ ...prev, showHowToPlay: true }));
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm font-semibold"
              >
                ?
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Area */}
      <div 
        ref={gameAreaRef}
        className="flex-1 relative bg-gradient-to-b from-slate-300/40 to-slate-400/50 overflow-hidden border-y border-purple-500/30 min-h-0"
        onTouchMove={!isMobile ? handleTouch : undefined}
        onTouchStart={!isMobile ? handleTouch : undefined}
        onTouchEnd={!isMobile ? handleTouchEnd : undefined}
        style={{ touchAction: isMobile ? 'pan-y' : 'none' }}
      >
        {/* Game Objects */}
        {gameObjects.map(obj => (
          <div
            key={obj.id}
            className="absolute transition-none drop-shadow-lg"
            style={{
              left: `${obj.x}%`,
              top: `${obj.y}%`,
              width: obj.type === 'rock' ? '5%' : '6%', // Rocas más pequeñas
              height: obj.type === 'rock' ? '5%' : '6%', // Rocas más pequeñas
              transform: 'translate3d(-50%, -50%, 0)',
              willChange: 'transform',
            }}
          >
            {obj.type === 'gem' && (
              <Image 
                src="/game/gem_logo_game.png" 
                alt="Gem" 
                width={50} 
                height={50}
                className="w-full h-full object-contain animate-spin drop-shadow-md"
              />
            )}
            {obj.type === 'rock' && (
              <Image 
                src="/game/rock.png" 
                alt="Rock" 
                width={50} 
                height={50}
                className="w-full h-full object-contain drop-shadow-md"
              />
            )}
            {obj.type === 'life' && (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-green-500 text-xl font-bold animate-pulse drop-shadow-lg bg-white/20 rounded-full px-2">+1</span>
              </div>
            )}
          </div>
        ))}

        {/* Player */}
        <div
          className="absolute bottom-4 drop-shadow-lg"
          style={{
            left: `${playerX}%`,
            width: '10%', // Aumentado de 8% a 10%
            height: '10%', // Aumentado de 8% a 10%
            transform: 'translate3d(-50%, 0, 0)',
            willChange: 'transform',
          }}
        >
          <Image 
            src={selectedCharacter.imageUrl} 
            alt={selectedCharacter.name} 
            width={80} 
            height={80}
            className={`w-full h-full object-contain transition-transform duration-100 ease-out drop-shadow-md ${playerDirection === 'left' ? 'scale-x-[-1]' : ''}`}
          />
        </div>

        {/* Pause Overlay */}
        {gameState.isPaused && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg text-center">
              <h2 className="text-white text-xl sm:text-2xl mb-3 sm:mb-4">Game Paused</h2>
              <button
                onClick={togglePause}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 sm:px-6 sm:py-2 rounded transition-colors text-sm"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* Mobile Control Buttons */}
        {isMobile && (
          <>
            {/* Left Button */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleMobileButtonStart('left');
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleMobileButtonEnd('left');
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                handleMobileButtonEnd('left');
              }}
              className={`absolute bottom-6 left-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold transition-all duration-150 shadow-lg border-2 select-none ${
                mobileControls.left 
                  ? 'bg-purple-600 border-purple-400 scale-110 shadow-purple-500/50' 
                  : 'bg-purple-700/80 border-purple-500/50 hover:bg-purple-600/90'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              ←
            </button>

            {/* Right Button */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleMobileButtonStart('right');
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleMobileButtonEnd('right');
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                handleMobileButtonEnd('right');
              }}
              className={`absolute bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold transition-all duration-150 shadow-lg border-2 select-none ${
                mobileControls.right 
                  ? 'bg-purple-600 border-purple-400 scale-110 shadow-purple-500/50' 
                  : 'bg-purple-700/80 border-purple-500/50 hover:bg-purple-600/90'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="p-2 sm:p-4 bg-black/20 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 flex-shrink-0">
        <div className="flex gap-2 sm:gap-4">
          {!gameState.isPlaying && !gameState.gameOver && (
            <button
              onClick={startGame}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 sm:px-6 sm:py-2 rounded transition-colors text-sm"
            >
              Start Game
            </button>
          )}
          
          {gameState.isPlaying && (
            <button
              onClick={togglePause}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 sm:px-6 sm:py-2 rounded transition-colors text-sm"
            >
              {gameState.isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <div className="text-white text-xs sm:text-sm text-center">
            {isMobile ? (
              <span>Use floating arrow buttons to move • SPACE to pause</span>
            ) : (
              <>
                <span className="block sm:hidden">Tap screen to move • SPACE to pause</span>
                <span className="hidden sm:block">Use ← → arrows or A/D keys to move • SPACE to pause</span>
              </>
            )}
          </div>
          
          <div className="text-gray-400 text-xs">
            Made by{' '}
            <a 
              href="https://x.com/xisk_99" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              @xisk_99
            </a>
          </div>
        </div>
      </div>

      {/* How to Play Modal */}
      {gameState.showHowToPlay && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-gray-800 p-4 sm:p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-xl sm:text-2xl mb-3 sm:mb-4 text-center">How to Play</h2>
            <div className="text-gray-300 space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <p>🎮 <strong>Objective:</strong> Collect gems while avoiding rocks!</p>
              <p>👤 <strong>Character:</strong> {isMobile ? 'Tap' : 'Click'} the "Change Character" button to choose from XISK or 250 unique GEMtard NFTs!</p>
              <p>⛏️ <strong>Controls:</strong></p>
              <ul className="ml-4 space-y-1">
                {isMobile ? (
                  <li>• Tap and hold the floating arrow buttons to move</li>
                ) : (
                  <>
                    <li className="block sm:hidden">• Tap on screen where you want to move</li>
                    <li className="hidden sm:block">• Use ← → arrow keys or A/D to move</li>
                  </>
                )}
                <li>• SPACE to pause/resume</li>
              </ul>
              <p>💎 <strong>Scoring:</strong> Each gem = 1 point</p>
              <p>❤️ <strong>Lives:</strong> Start with 3 lives, lose 1 when hitting rocks</p>
              <p>💚 <strong>+1 Life:</strong> Green +1 items restore a life</p>
              <p>🎯 <strong>Goal:</strong> Get the highest score possible!</p>
            </div>
            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setGameState(prev => ({ ...prev, showHowToPlay: false }))}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-1.5 sm:py-2 rounded transition-colors text-sm"
              >
                Close
              </button>
              {!gameState.isPlaying && (
                <button
                  onClick={startGame}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-1.5 sm:py-2 rounded transition-colors text-sm"
                >
                  Start Game
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Character Selection Modal */}
      {showCharacterSelection && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className={`bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl max-w-4xl w-full border border-purple-500/50 shadow-2xl flex flex-col ${
            isMobile ? 'h-[75vh] mt-auto mb-4' : 'max-h-[90vh]'
          }`}>
            {/* Fixed Header */}
            <div className="p-4 sm:p-6 border-b border-gray-700/50 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-white text-xl sm:text-2xl font-bold mb-1">Choose Your GEMtard</h2>
                  <p className="text-gray-300 text-sm">Select from XISK or 250 unique NFT characters</p>
                </div>
                <button
                  onClick={() => setShowCharacterSelection(false)}
                  className="text-gray-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              
              <div className="bg-purple-600/20 border border-purple-400/50 rounded-lg p-3">
                <div className="text-gray-200 text-sm">
                  Currently selected: <span className="text-purple-200 font-bold text-base">{selectedCharacter.name}</span>
                </div>
              </div>
            </div>
            
            {/* Scrollable Character Grid */}
            <div className={`overflow-y-auto flex-1 p-4 sm:p-6 ${isMobile ? 'min-h-0' : ''}`}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    onClick={() => {
                      setSelectedCharacter(character);
                      track('character_selected', {
                        character_id: character.id,
                        character_name: character.name,
                        timestamp: new Date().toISOString(),
                      });
                    }}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-3 transition-all duration-200 hover:scale-105 ${
                      selectedCharacter.id === character.id
                        ? 'border-purple-400 bg-purple-500/30 shadow-lg shadow-purple-500/50 ring-2 ring-purple-400'
                        : 'border-gray-600 hover:border-purple-400 hover:shadow-md'
                    }`}
                  >
                    <div className="aspect-square bg-gray-700/50 relative">
                      <Image
                        src={character.imageUrl}
                        alt={character.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to XISK image if NFT image fails to load
                          const target = e.target as HTMLImageElement;
                          if (target.src !== '/game/xisk.png') {
                            target.src = '/game/xisk.png';
                          }
                        }}
                      />
                      
                      {/* Selected overlay */}
                      {selectedCharacter.id === character.id && (
                        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                          <div className="bg-purple-500 text-white text-lg rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg">
                            ✓
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className={`absolute bottom-0 left-0 right-0 text-white text-xs p-1.5 text-center ${
                      selectedCharacter.id === character.id ? 'bg-purple-600/90' : 'bg-black/80'
                    }`}>
                      <div className="truncate font-medium" title={character.name}>
                        {character.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Fixed Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-700/50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowCharacterSelection(false);
                  showToast(`Selected ${selectedCharacter.name}! 🎮`);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 px-4 rounded-lg transition-all duration-200 font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Select {selectedCharacter.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className={`bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border border-purple-500/30 shadow-2xl flex flex-col ${
            isMobile ? 'w-full max-w-sm max-h-[90vh]' : 'w-full max-w-2xl max-h-[90vh]'
          }`}>
            
            {/* Header */}
            <div className="p-4 sm:p-6 text-center border-b border-gray-700/50 flex-shrink-0">
              {/* Gem Logo */}
              <div className="mb-3">
                <Image 
                  src="/game/gem_logo.png" 
                  alt="Gem Logo" 
                  width={50} 
                  height={50}
                  className="mx-auto animate-pulse sm:w-16 sm:h-16"
                />
              </div>
              
              {/* Epic Title */}
              <h2 className="text-white text-xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
                GAME OVER!
              </h2>
              
              {/* Score Display */}
              <div className="text-gray-300 text-sm mb-1 font-medium">Gems Mined</div>
              <div className="text-yellow-400 text-2xl sm:text-4xl font-bold mb-1 drop-shadow-lg">
                {gameState.score}
              </div>
              <div className="text-purple-300 text-xs sm:text-sm font-medium">
                {gameState.score === 1 ? 'First step!' : 
                 gameState.score < 10 ? 'Good start!' :
                 gameState.score < 25 ? 'Excellent work!' :
                 gameState.score < 50 ? 'You are an expert!' :
                 'MINING LEGEND!'}
              </div>
            </div>

            {/* Image Preview Section */}
            {shareImageUrl && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                <div className="text-gray-300 text-sm mb-3 text-center">Your epic score card:</div>
                <div className={`relative mx-auto rounded-lg overflow-hidden border-2 border-purple-500/50 shadow-lg ${
                  isMobile ? 'w-full aspect-[4/3]' : 'w-full max-w-md aspect-[4/3]'
                }`}>
                  <img 
                    src={shareImageUrl} 
                    alt="Score Card" 
                    className="w-full h-full object-contain bg-gray-900"
                  />
                </div>
                <div className="text-center text-gray-400 text-xs mt-2">
                  Featuring your character: <span className="text-purple-300 font-semibold">{selectedCharacter.name}</span>
                </div>
              </div>
            )}
            
            {!shareImageUrl && (
              <div className="flex-1 flex items-center justify-center p-6 min-h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <div className="text-gray-400 text-sm">
                    Generating your epic score card... ✨
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-700/50 flex-shrink-0">
              <div className="space-y-3">
                {/* Share Instructions */}
                {shareImageUrl && (
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="text-blue-200 text-xs sm:text-sm font-medium mb-1">
                      💎 Share with Gemstone Community!
                    </div>
                    <div className="text-gray-300 text-xs leading-relaxed">
                      {isMobile ? (
                        <>1. Tap "📋 Copy Image" → 2. Tap "🚀 Post to X" → 3. Paste your score card and tag the community!</>
                      ) : (
                        <>1. Copy your score card → 2. Click "🚀 Post to X" → 3. Paste (Ctrl+V) and share your achievement!</>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={startGame}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold text-sm"
                  >
                    🎮 Play Again
                  </button>
                  <button
                    onClick={shareScoreImage}
                    disabled={!shareImageUrl}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors font-semibold text-sm"
                  >
                    🚀 Post to X
                  </button>
                </div>
                
                {shareImageUrl && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyImageToClipboard}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-lg transition-colors text-xs sm:text-sm"
                    >
                      📋 Copy Image
                    </button>
                    <button
                      onClick={downloadScoreImage}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors text-xs sm:text-sm"
                    >
                      💾 Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Canvas for Image Generation */}
      <canvas 
        ref={canvasRef} 
        className="hidden" 
        width={800} 
        height={600}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg border border-purple-500/30 max-w-sm text-center">
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiningRushGame; 