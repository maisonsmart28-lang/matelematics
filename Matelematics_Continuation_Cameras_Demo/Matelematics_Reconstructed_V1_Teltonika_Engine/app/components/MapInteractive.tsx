export default function MapInteractive() {
  return (
    <section className='py-12'>
      <div className='max-w-7xl mx-auto px-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          {/* Map */}
          <div className='w-full md:w-2/3 h-[60vh] bg-gradient-to-r from-slate-900 via-blue-900 to-black rounded-3xl overflow-hidden'>
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='text-center text-white'>
                <span className='text-2xl font-bold'>Casablanca</span>
              </div>
              <div className='text-white'>Rabat</div>
              <div className='text-white'>Tanger</div>
              <div className='text-white'>Marrakech</div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className='bg-white rounded-3xl shadow-lg p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-700 font-medium'>Fleet active :</span>
              <span className='text-blue-600 font-bold'>128</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-700 font-medium'>En circulation :</span>
              <span className='text-blue-600 font-bold'>97</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-700 font-medium'>Arrêt :</span>
              <span className='text-blue-600 font-bold'>31</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-gray-700 font-medium'>Alertes :</span>
              <span className='text-blue-600 font-bold'>6</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}