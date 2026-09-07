'use client';

import { motion } from 'framer-motion';

const logos = [
  '/images/teltonika.png',
  '/images/queclink.png',
  '/images/ruptela.png',
  '/images/u-blox.png',
  '/images/bosch.png',
  '/images/ifm.png',
  '/images/ble.png',
  '/images/canbus.png',
];

export default function PartnersScroll() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto overflow-x-auto whitespace-nowrap">
        <motion.div
          className="inline-block whitespace-nowrap"
          initial={{ x: 0 }}
          animate={{ x: -200 }}
          transition={{ duration: 5, ease: 'linear', repeat: -1 }}
        >
          {logos.map((src) => (
            <motion.img
              key={src}
              src={src}
              alt="Partner logo"
              className="w-12 h-12 object-contain mr-4"
              animate={{ x: 0 }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}