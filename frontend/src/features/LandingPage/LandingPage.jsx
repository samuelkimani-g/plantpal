import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-cream-white text-charcoal-gray">
      <div className="max-w-4xl text-center p-8 rounded-xl shadow-xl bg-white bg-opacity-90 border border-soft-leaf-green/30 backdrop-blur-sm">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-deep-forest-green mb-6 leading-tight animate-fade-in-down">
          PlantPal
          <span className="text-soft-leaf-green ml-4">🌿</span>
        </h1>
        <p className="text-xl md:text-2xl leading-relaxed mb-12 text-muted-earth-brown animate-fade-in px-4">
          Grow Through What You Go Through.
          <br className="hidden md:inline"/> PlantPal is a gamified, interactive mindfulness app where your virtual plants
          grow based on your daily journaling, music listening habits, and emotional well-being.
          <br className="hidden md:inline"/> Nurture your mental health by externalizing emotions as a living, evolving virtual plant world.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up">
          <Link
            to="/register"
            className="w-full sm:w-auto px-10 py-5 bg-soft-leaf-green text-deep-forest-green font-bold rounded-full shadow-lg text-lg
                       hover:bg-deep-forest-green hover:text-soft-leaf-green transition-all duration-300 transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-soft-leaf-green focus:ring-opacity-50"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-soft-leaf-green text-soft-leaf-green font-bold rounded-full text-lg
                       hover:bg-soft-leaf-green hover:text-deep-forest-green transition-all duration-300 transform hover:scale-105
                       focus:outline-none focus:ring-4 focus:ring-soft-leaf-green focus:ring-opacity-50"
          >
            Login
          </Link>
        </div>
      </div>
      {/* Tailwind animation classes - these are utility classes, no need for <style jsx> anymore */}
      {/* For actual animations, you'd define them in tailwind.config.js extend.animation */}
      {/* For now, just placeholder names to denote where animations would be */}
    </div>
  );
};

export default LandingPage;