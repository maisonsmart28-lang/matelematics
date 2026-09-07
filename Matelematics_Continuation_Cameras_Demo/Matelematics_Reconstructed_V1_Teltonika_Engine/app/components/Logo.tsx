import React from 'react';

const Logo = () => {
  return (
    <div className='flex items-center space-x-3'>
      <div className='w-8 h-8'>
        <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
          <path d='M4 12C4 13.6569 5.34315 15 7 15H9C10.6569 15 12 13.6569 12 12C12 10.3431 10.6569 9 9 9H7C5.34315 9 4 10.3431 4 12Z' stroke='#2563EB' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
          <path d='M7 12C7 10.3431 5.65685 9 4 9C2.34315 9 1 10.3431 1 12C1 13.6569 2.34315 15 4 15H6C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9H4C2.34315 9 1 10.3431 1 12Z' fill='#38BDF8'/>
          <path d='M12 12C12 10.3431 10.6569 9 9 9H7C5.34315 9 4 10.3431 4 12C4 13.6569 5.34315 15 7 15H9C10.6569 15 12 13.6569 12 12Z' fill='#2563EB'/>
          <path d='M16 12C16 10.3431 14.6569 9 13 9H11C9.34315 9 8 10.3431 8 12C8 13.6569 9.34315 15 11 15H13C14.6569 15 16 13.6569 16 12Z' fill='#38BDF8'/>
          <path d='M20 12C20 10.3431 18.6569 9 17 9H15C13.34315 9 12 10.3431 12 12C12 13.6569 13.34315 15 15 15H17C18.6569 15 20 13.6569 20 12Z' fill='#2563EB'/>
          <path d='M12 16C13.6569 16 15 14.6569 15 13C15 11.3431 13.6569 10 12 10C10.3431 10 9 11.3431 9 13C9 14.6569 10.3431 16 12 16Z' fill='#38BDF8'/>
        </svg>
      </div>
      <span className='font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-[#2563EB] to-[#38BDF8]'>
        Matelematics
      </span>
    </div>
  );
};

export default Logo;