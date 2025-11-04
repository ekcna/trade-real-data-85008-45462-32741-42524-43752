import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface RocketAnimationProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const RocketAnimation = ({ isOpen, onComplete }: RocketAnimationProps) => {
  const [phase, setPhase] = useState<'launch' | 'flying' | 'arriving'>('launch');

  useEffect(() => {
    if (!isOpen) {
      setPhase('launch');
      return;
    }

    const launchTimer = setTimeout(() => setPhase('flying'), 1000);
    const arriveTimer = setTimeout(() => setPhase('arriving'), 3000);
    const completeTimer = setTimeout(() => onComplete(), 5000);

    return () => {
      clearTimeout(launchTimer);
      clearTimeout(arriveTimer);
      clearTimeout(completeTimer);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-black via-purple-950 to-black overflow-hidden">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
        onClick={onComplete}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Stars background */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.7,
            }}
          />
        ))}
      </div>

      {/* Shooting stars */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`shooting-${i}`}
          className="absolute w-20 h-0.5 bg-gradient-to-r from-white to-transparent"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 50}%`,
            animation: `shooting-star ${3 + Math.random() * 2}s linear infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}

      {/* Bitcoin Planet (destination) */}
      <div
        className={`absolute transition-all duration-[2000ms] ${
          phase === 'arriving' ? 'scale-150 opacity-100' : 'scale-100 opacity-60'
        }`}
        style={{
          right: phase === 'arriving' ? '50%' : '10%',
          top: phase === 'arriving' ? '50%' : '15%',
          transform: phase === 'arriving' ? 'translate(50%, -50%)' : 'translate(0, 0)',
        }}
      >
        <div className="relative w-32 h-32">
          {/* Planet glow */}
          <div className="absolute inset-0 rounded-full bg-orange-400 blur-2xl opacity-50 animate-pulse" />
          {/* Planet surface */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500 shadow-2xl">
            {/* Bitcoin symbol */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">₿</span>
            </div>
            {/* Craters/texture */}
            <div className="absolute inset-2 rounded-full opacity-20">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-black/30"
                  style={{
                    width: `${10 + Math.random() * 20}px`,
                    height: `${10 + Math.random() * 20}px`,
                    left: `${Math.random() * 80}%`,
                    top: `${Math.random() * 80}%`,
                  }}
                />
              ))}
            </div>
          </div>
          {/* Orbit ring */}
          <div className="absolute -inset-8 border-2 border-yellow-400/30 rounded-full animate-spin-slow" />
        </div>
      </div>

      {/* Earth (starting point) */}
      <div
        className="absolute left-10 bottom-20"
        style={{
          opacity: phase === 'launch' ? 1 : 0.3,
          transition: 'opacity 2s',
        }}
      >
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-green-400 to-blue-500 shadow-2xl">
            {/* Continents */}
            <div className="absolute inset-0 rounded-full opacity-40">
              <div className="absolute w-6 h-8 bg-green-600 rounded-full top-2 left-4" />
              <div className="absolute w-8 h-6 bg-green-600 rounded-full bottom-3 right-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Rocket */}
      <div
        className={`absolute transition-all duration-[3000ms] ease-in-out ${
          phase === 'launch' ? 'rocket-launch' : phase === 'flying' ? 'rocket-flying' : 'rocket-arriving'
        }`}
        style={{
          left: phase === 'launch' ? '15%' : phase === 'flying' ? '50%' : '75%',
          bottom: phase === 'launch' ? '30%' : phase === 'flying' ? '50%' : '50%',
          transform: `rotate(${phase === 'launch' ? '0deg' : phase === 'flying' ? '-25deg' : '-45deg'}) scale(${
            phase === 'arriving' ? 0.7 : 1
          })`,
        }}
      >
        <div className="relative w-20 h-32">
          {/* Rocket body */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-24 bg-gradient-to-b from-gray-300 via-white to-gray-200 rounded-t-full shadow-xl">
            {/* Window */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-gray-400">
              <div className="absolute inset-1 bg-gradient-to-br from-white/60 to-transparent rounded-full" />
            </div>
            {/* Red stripe */}
            <div className="absolute top-12 left-0 right-0 h-3 bg-red-500" />
            {/* Bitcoin logo on rocket */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-orange-400 font-bold text-xl">₿</div>
          </div>

          {/* Rocket fins */}
          <div className="absolute bottom-0 -left-1 w-4 h-8 bg-gradient-to-br from-red-500 to-red-700 transform -skew-x-12 shadow-lg" />
          <div className="absolute bottom-0 -right-1 w-4 h-8 bg-gradient-to-bl from-red-500 to-red-700 transform skew-x-12 shadow-lg" />

          {/* Flame/exhaust */}
          {(phase === 'launch' || phase === 'flying') && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-8">
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 w-6 h-12 bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 opacity-90 animate-pulse rounded-b-full blur-sm" />
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-16 bg-gradient-to-b from-white via-yellow-400 to-orange-500 opacity-80 animate-pulse rounded-b-full" />
                {/* Smoke particles */}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-gray-400 rounded-full opacity-60 animate-float"
                    style={{
                      left: `${-2 + Math.random() * 12}px`,
                      bottom: `${-10 - Math.random() * 20}px`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '1s',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sparkles around rocket */}
          {phase === 'flying' && (
            <>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-ping"
                  style={{
                    left: `${-10 + Math.random() * 50}px`,
                    top: `${Math.random() * 100}px`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Success message */}
      {phase === 'arriving' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-fade-in z-10">
          <div className="bg-black/60 backdrop-blur-lg rounded-3xl px-12 py-8 border border-orange-400/30 shadow-2xl">
            <div className="text-6xl mb-4 animate-bounce">🚀</div>
            <h2 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
              Transaction Complete!
            </h2>
            <p className="text-xl text-orange-300">
              Your crypto has reached the Bitcoin planet! 🪐
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-yellow-400">
              <span className="text-2xl animate-pulse">✨</span>
              <span className="text-lg font-semibold">Mission Successful</span>
              <span className="text-2xl animate-pulse">✨</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shooting-star {
          0% {
            transform: translateX(0) translateY(0) rotate(-45deg);
            opacity: 1;
          }
          100% {
            transform: translateX(-200px) translateY(200px) rotate(-45deg);
            opacity: 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) scale(1.2);
            opacity: 0;
          }
        }

        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }

        .animate-float {
          animation: float 1s ease-out forwards;
        }

        .rocket-launch {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-3px) rotate(-2deg); }
          75% { transform: translateX(3px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
};
