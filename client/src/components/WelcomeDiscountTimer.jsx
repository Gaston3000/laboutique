import { useEffect, useState } from "react";

export default function WelcomeDiscountTimer({ expiresAt, compact = false }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        setIsExpired(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (isExpired) {
    return null;
  }

  if (compact) {
    return (
      <span className="welcome-discount-timer-compact">
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className="welcome-discount-timer-inline">
      <span className="timer-unit">
        {String(timeLeft.hours).padStart(2, '0')}h
      </span>
      <span className="timer-separator">:</span>
      <span className="timer-unit">
        {String(timeLeft.minutes).padStart(2, '0')}m
      </span>
      <span className="timer-separator">:</span>
      <span className="timer-unit">
        {String(timeLeft.seconds).padStart(2, '0')}s
      </span>
    </div>
  );
}
