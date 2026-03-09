import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Modal component using React Portal to render outside main-content container.
 * This fixes the backdrop-filter issue that breaks position:fixed.
 */
const Modal = ({ isOpen, onClose, children, className = '' }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
