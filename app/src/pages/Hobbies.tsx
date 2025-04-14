import React from 'react';
import PageTransition from '../components/PageTransition';
import { Gamepad2, ChefHat, Server } from 'lucide-react';
import { motion } from 'framer-motion';

function Hobbies() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Hobbies & Interests</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <motion.div
              className="flex justify-center mb-4"
              animate={{
                rotate: [0, -10, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <Gamepad2 className="w-12 h-12 text-purple-500" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-3 text-center">Gaming</h2>
            <p className="text-sm text-center">
              Enthusiast gamer with a passion for RPGs and strategy games.
              Currently exploring indie game development as a hobby.
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <motion.div
              className="flex justify-center mb-4"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <ChefHat className="w-12 h-12 text-red-500" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-3 text-center">Cooking</h2>
            <p className="text-sm text-center">
              Love experimenting with different cuisines and perfecting my sous vide technique.
              Specialty in fusion dishes combining Asian and Mediterranean flavors.
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <motion.div
              className="flex justify-center mb-4"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <Server className="w-12 h-12 text-green-500" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-3 text-center">Homelabbing</h2>
            <p className="text-sm text-center">
              Running a personal homelab for experimenting with new technologies,
              self-hosting services, and learning about infrastructure management.
            </p>
          </div>
        </div>
        
        <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Current Projects</h2>
          <ul className="space-y-4">
            <li>
              <h3 className="font-semibold">Home Automation System</h3>
              <p className="text-sm">
                Building a comprehensive home automation setup using Home Assistant,
                integrating smart devices and custom sensors.
              </p>
            </li>
            <li>
              <h3 className="font-semibold">Kubernetes Cluster</h3>
              <p className="text-sm">
                Managing a personal k3s cluster for running various services and
                experimenting with cloud-native technologies.
              </p>
            </li>
            <li>
              <h3 className="font-semibold">Cooking Blog</h3>
              <p className="text-sm">
                Documenting my cooking experiments and recipes on a self-hosted blog
                platform built with modern web technologies.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </PageTransition>
  );
}

export default Hobbies;