// ProtonDiagnostics — redirects to existing MangoUltrasound page
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtonDiagnostics = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/mango/ultrasound', { replace: true }); }, [navigate]);
  return null;
};

export default ProtonDiagnostics;
