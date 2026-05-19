import { useState } from 'react';

interface AuthFeedbackProps {
  error?: string;
  loading: boolean;
}

const AuthFeedback: React.FC<AuthFeedbackProps> = ({ error, loading }) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
  };

  if (loading) {
    return (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">登入中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">{error}</span>
        <span className="absolute right-0 top-0 px-4 py-3" onClick={handleClose}>
          ×
        </span>
      </div>
    );
  }

  return null;
};

export default AuthFeedback;