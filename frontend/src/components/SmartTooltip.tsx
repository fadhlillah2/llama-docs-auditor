import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  BookOpenIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type TooltipType = 'info' | 'help' | 'warning' | 'tip' | 'tutorial';
export type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';

export interface SmartTooltipProps {
  content: React.ReactNode;
  title?: string;
  type?: TooltipType;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  delay?: number;
  duration?: number;
  disabled?: boolean;
  persistent?: boolean;
  showArrow?: boolean;
  maxWidth?: string;
  children: React.ReactElement;
  className?: string;
  onShow?: () => void;
  onHide?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    type?: 'primary' | 'secondary';
  };
  helpLink?: {
    url: string;
    label: string;
  };
}

const SmartTooltip: React.FC<SmartTooltipProps> = ({
  content,
  title,
  type = 'info',
  position = 'top',
  trigger = 'hover',
  delay = 300,
  duration = 5000,
  disabled = false,
  persistent = false,
  showArrow = true,
  maxWidth = '300px',
  children,
  className = '',
  onShow,
  onHide,
  action,
  helpLink
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [computedPosition, setComputedPosition] = useState<TooltipPosition>(position);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get icon based on tooltip type
  const getIcon = () => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'info':
        return <InformationCircleIcon className={`${iconClass} text-blue-400`} />;
      case 'help':
        return <QuestionMarkCircleIcon className={`${iconClass} text-cyan-400`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClass} text-yellow-400`} />;
      case 'tip':
        return <LightBulbIcon className={`${iconClass} text-green-400`} />;
      case 'tutorial':
        return <BookOpenIcon className={`${iconClass} text-purple-400`} />;
      default:
        return <InformationCircleIcon className={`${iconClass} text-blue-400`} />;
    }
  };

  // Get styling based on tooltip type
  const getStyling = () => {
    const styles = {
      info: {
        bgColor: 'bg-blue-900/95',
        borderColor: 'border-blue-600',
        textColor: 'text-blue-100',
        titleColor: 'text-blue-50'
      },
      help: {
        bgColor: 'bg-cyan-900/95',
        borderColor: 'border-cyan-600',
        textColor: 'text-cyan-100',
        titleColor: 'text-cyan-50'
      },
      warning: {
        bgColor: 'bg-yellow-900/95',
        borderColor: 'border-yellow-600',
        textColor: 'text-yellow-100',
        titleColor: 'text-yellow-50'
      },
      tip: {
        bgColor: 'bg-green-900/95',
        borderColor: 'border-green-600',
        textColor: 'text-green-100',
        titleColor: 'text-green-50'
      },
      tutorial: {
        bgColor: 'bg-purple-900/95',
        borderColor: 'border-purple-600',
        textColor: 'text-purple-100',
        titleColor: 'text-purple-50'
      }
    };
    return styles[type];
  };

  // Calculate optimal position
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let bestPosition: TooltipPosition = position;

    if (position === 'auto') {
      // Determine best position based on available space
      const space = {
        top: triggerRect.top,
        bottom: viewport.height - triggerRect.bottom,
        left: triggerRect.left,
        right: viewport.width - triggerRect.right
      };

      const maxSpace = Math.max(...Object.values(space));

      if (maxSpace === space.top) bestPosition = 'top';
      else if (maxSpace === space.bottom) bestPosition = 'bottom';
      else if (maxSpace === space.left) bestPosition = 'left';
      else bestPosition = 'right';
    }

    setComputedPosition(bestPosition);
  }, [position]);

  // Show tooltip
  const showTooltip = useCallback(() => {
    if (disabled) return;

    // Clear any existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      onShow?.();
      calculatePosition();

      // Auto-hide if not persistent
      if (!persistent && duration > 0) {
        hideTimeoutRef.current = setTimeout(() => {
          hideTooltip();
        }, duration);
      }
    }, delay);
  }, [disabled, delay, onShow, calculatePosition, persistent, duration]);

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    setIsVisible(false);
    onHide?.();
  }, [onHide]);

  // Handle trigger events
  const handleMouseEnter = () => {
    if (trigger === 'hover') showTooltip();
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') hideTooltip();
  };

  const handleClick = () => {
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }
  };

  const handleFocus = () => {
    if (trigger === 'focus') showTooltip();
  };

  const handleBlur = () => {
    if (trigger === 'focus') hideTooltip();
  };

  // Manual control
  useEffect(() => {
    if (trigger === 'manual') {
      // Parent component controls visibility via props
      if (disabled) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }
  }, [trigger, disabled, showTooltip, hideTooltip]);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      // Recalculate on window resize
      window.addEventListener('resize', calculatePosition);
      return () => window.removeEventListener('resize', calculatePosition);
    }
  }, [isVisible, calculatePosition]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const styling = getStyling();

  // Clone child and add props
  const childWithProps = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'aria-describedby': isVisible ? `tooltip-${React.useId()}` : undefined,
    'aria-expanded': isVisible
  });

  // Calculate tooltip positioning
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      zIndex: 50,
      maxWidth
    };

    switch (computedPosition) {
      case 'top':
        return {
          ...baseStyles,
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          ...baseStyles,
          right: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          ...baseStyles,
          left: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)'
        };
      default:
        return baseStyles;
    }
  };

  // Get arrow styles
  const getArrowStyles = () => {
    const arrowSize = 8;
    const baseArrow = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
      borderStyle: 'solid' as const
    };

    switch (computedPosition) {
      case 'top':
        return {
          ...baseArrow,
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0`,
          borderColor: `${styling.borderColor.replace('border-', '').split(' ')[0]} transparent transparent`
        };
      case 'bottom':
        return {
          ...baseArrow,
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px`,
          borderColor: `transparent transparent ${styling.borderColor.replace('border-', '').split(' ')[0]}`
        };
      case 'left':
        return {
          ...baseArrow,
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: `transparent transparent transparent ${styling.borderColor.replace('border-', '').split(' ')[0]}`
        };
      case 'right':
        return {
          ...baseArrow,
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: `transparent ${styling.borderColor.replace('border-', '').split(' ')[0]} transparent transparent`
        };
      default:
        return baseArrow;
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {childWithProps}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={getPositionStyles()}
            className={`
              ${styling.bgColor} ${styling.borderColor}
              border rounded-lg shadow-xl backdrop-blur-sm
              ${maxWidth ? 'max-w-' + maxWidth : ''}
            `}
            role="tooltip"
          >
            {showArrow && (
              <div style={getArrowStyles()} />
            )}

            <div className="p-3">
              {/* Header */}
              {(title || type !== 'info') && (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getIcon()}
                    {title && (
                      <h4 className={`font-semibold text-sm ${styling.titleColor}`}>
                        {title}
                      </h4>
                    )}
                  </div>

                  {/* Close button for click-triggered tooltips */}
                  {trigger === 'click' && (
                    <button
                      onClick={hideTooltip}
                      className={`p-1 rounded hover:bg-white/10 ${styling.textColor} opacity-70 hover:opacity-100`}
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={`text-sm ${styling.textColor} leading-relaxed`}>
                {content}
              </div>

              {/* Actions */}
              {(action || helpLink) && (
                <div className="mt-3 flex items-center justify-between">
                  {action && (
                    <button
                      onClick={() => {
                        action.onClick();
                        hideTooltip();
                      }}
                      className={`
                        px-3 py-1 text-xs font-medium rounded
                        transition-colors duration-200
                        ${action.type === 'primary'
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }
                      `}
                    >
                      {action.label}
                    </button>
                  )}

                  {helpLink && (
                    <a
                      href={helpLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        text-xs underline ${styling.textColor} opacity-70
                        hover:opacity-100 transition-opacity
                      `}
                    >
                      {helpLink.label}
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartTooltip;