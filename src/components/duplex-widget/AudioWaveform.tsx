'use client';

import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  analyserNode: AnalyserNode | null;
  isActive?: boolean;
  barCount?: number;
  barGap?: number;
  barColor?: string;
  inactiveColor?: string;
  className?: string;
  height?: number;
}

export function AudioWaveform({
  analyserNode,
  isActive = false,
  barCount = 48,
  barGap = 3,
  barColor = '#ffffff',
  inactiveColor = 'rgba(255,255,255,0.18)',
  className = '',
  height = 72,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const frequencyData = new Uint8Array(analyserNode?.frequencyBinCount ?? barCount);
    const timeDomainData = new Uint8Array(analyserNode?.fftSize ?? 256);

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(canvasHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, canvasHeight);

      const barWidth = Math.max(2, (width - barGap * (barCount - 1)) / barCount);
      phaseRef.current += 0.08;

      let amplitudes: number[] = [];

      if (isActive && analyserNode) {
        analyserNode.getByteFrequencyData(frequencyData);
        analyserNode.getByteTimeDomainData(timeDomainData);

        amplitudes = Array.from({ length: barCount }, (_, index) => {
          const freqIndex = Math.floor((index / barCount) * frequencyData.length);
          const freqValue = frequencyData[freqIndex] / 255;

          const timeIndex = Math.floor((index / barCount) * timeDomainData.length);
          const timeValue = Math.abs(timeDomainData[timeIndex] - 128) / 128;

          return Math.min(1, freqValue * 0.75 + timeValue * 0.45);
        });
      } else {
        amplitudes = Array.from({ length: barCount }, (_, index) => {
          const wave = Math.sin(phaseRef.current + index * 0.35) * 0.5 + 0.5;
          return wave * 0.12;
        });
      }

      for (let index = 0; index < barCount; index += 1) {
        const amplitude = amplitudes[index];
        const barHeight = Math.max(4, amplitude * canvasHeight * 0.92);
        const x = index * (barWidth + barGap);
        const y = (canvasHeight - barHeight) / 2;

        context.fillStyle = isActive ? barColor : inactiveColor;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        context.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, barColor, barCount, barGap, inactiveColor, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{
        width: '100%',
        height,
        display: 'block',
      }}
    />
  );
}
