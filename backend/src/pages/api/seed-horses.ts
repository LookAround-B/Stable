import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🐴 Seeding horses...')

    // Gender mapping: G = Gelding (Male), M = Mare (Female), S = Stallion (Male)
    const genderMap: Record<string, string> = {
      'G': 'Male',    // Gelding
      'M': 'Female',  // Mare
      'S': 'Male',    // Stallion
    }

    const allHorses = [
      // ===== SCHOOL HORSES (27) =====
      { name: 'Leon', gender: 'G', category: 'School Horse' },
      { name: 'Glory', gender: 'G', category: 'School Horse' },
      { name: 'Moon Beam', gender: 'M', category: 'School Horse' },
      { name: 'Saloni', gender: 'M', category: 'School Horse' },
      { name: 'Starlight', gender: 'M', category: 'School Horse' },
      { name: 'Sir Coleman', gender: 'G', category: 'School Horse' },
      { name: 'Sea Star', gender: 'M', category: 'School Horse' },
      { name: 'C Dundee', gender: 'G', category: 'School Horse' },
      { name: 'Alta Strada', gender: 'M', category: 'School Horse' },
      { name: 'Miss Elegance', gender: 'M', category: 'School Horse' },
      { name: 'Mystic', gender: 'M', category: 'School Horse' },
      { name: 'General Belgrano', gender: 'G', category: 'School Horse' },
      { name: 'Dejavu', gender: 'G', category: 'School Horse' },
      { name: 'Gusty Ruler', gender: 'G', category: 'School Horse' },
      { name: 'Undounted Spirit', gender: 'G', category: 'School Horse' },
      { name: 'Smile Stone', gender: 'G', category: 'School Horse' },
      { name: 'Transformer', gender: 'G', category: 'School Horse' },
      { name: 'Vallee', gender: 'M', category: 'School Horse' },
      { name: 'Khumba', gender: 'G', category: 'School Horse' },
      { name: 'Kalina', gender: 'M', category: 'School Horse' },
      { name: 'Iconic Glory', gender: 'G', category: 'School Horse' },
      { name: 'Sheeba', gender: 'M', category: 'School Horse' },
      { name: 'Yamuna', gender: 'M', category: 'School Horse' },
      { name: 'Saraswathi', gender: 'G', category: 'School Horse' },
      { name: 'Cool Nature', gender: 'G', category: 'School Horse' },
      { name: 'Angelina', gender: 'M', category: 'School Horse' },
      { name: 'Ashley', gender: 'M', category: 'School Horse' },

      // ===== IN TRAINING / SHOW HORSES (28) =====
      { name: 'Dinky Boy', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Qurt De Mont Plaisir', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Vadim De Savigny', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Cadilac', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Campari', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Perseus', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Zara', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Pluto', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Catherina', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Fudge', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Tara', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Cocobar', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Colorado', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Paris', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Dakar', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Snowman', gender: 'G', category: 'Training/Show Horse' },
      { name: 'St Tropez', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Prada', gender: 'S', category: 'Training/Show Horse' },
      { name: 'Poppy', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Rodrigo', gender: 'S', category: 'Training/Show Horse' },
      { name: 'Claudia', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Knotty Dancer', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Wood Prince (Maximus)', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Conrad', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Fabia', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Phoebe', gender: 'M', category: 'Training/Show Horse' },
      { name: 'Marengo', gender: 'G', category: 'Training/Show Horse' },
      { name: 'Cesar', gender: 'G', category: 'Training/Show Horse' },

      // ===== LIVERY HORSES (35) =====
      { name: 'Zydney (Ziggy)', gender: 'G', category: 'Livery Horse' },
      { name: 'Hugo', gender: 'G', category: 'Livery Horse' },
      { name: 'Hobo', gender: 'M', category: 'Livery Horse' },
      { name: 'Barona', gender: 'G', category: 'Livery Horse' },
      { name: 'Hammer', gender: 'G', category: 'Livery Horse' },
      { name: 'Abraka Dabra', gender: 'M', category: 'Livery Horse' },
      { name: 'Oscar', gender: 'M', category: 'Livery Horse' },
      { name: 'Successful Dream', gender: 'G', category: 'Livery Horse' },
      { name: 'Clara', gender: 'G', category: 'Livery Horse' },
      { name: 'Ricardo', gender: 'G', category: 'Livery Horse' },
      { name: 'Cara', gender: 'M', category: 'Livery Horse' },
      { name: 'Theo Dore', gender: 'G', category: 'Livery Horse' },
      { name: 'Christy', gender: 'G', category: 'Livery Horse' },
      { name: 'Matthieus', gender: 'G', category: 'Livery Horse' },
      { name: 'Startina', gender: 'M', category: 'Livery Horse' },
      { name: 'Azlan', gender: 'G', category: 'Livery Horse' },
      { name: 'Barnaby', gender: 'M', category: 'Livery Horse' },
      { name: 'Sonia', gender: 'G', category: 'Livery Horse' },
      { name: 'Dream Boy', gender: 'M', category: 'Livery Horse' },
      { name: 'Bailey', gender: 'M', category: 'Livery Horse' },
      { name: 'Bucephalus', gender: 'G', category: 'Livery Horse' },
      { name: 'Jinx', gender: 'G', category: 'Livery Horse' },
      { name: 'Elliot', gender: 'G', category: 'Livery Horse' },
      { name: 'Apphira', gender: 'G', category: 'Livery Horse' },
      { name: 'Felotti', gender: 'M', category: 'Livery Horse' },
      { name: 'Eotina', gender: 'G', category: 'Livery Horse' },
      { name: 'Prometheus', gender: 'M', category: 'Livery Horse' },
      { name: 'Bonafee', gender: 'G', category: 'Livery Horse' },
      { name: "Faberge's Hero 3", gender: 'G', category: 'Livery Horse' },
      { name: 'Jean-Pierre', gender: 'G', category: 'Livery Horse' },
      { name: 'Leona', gender: 'M', category: 'Livery Horse' },
      { name: 'Julius', gender: 'G', category: 'Livery Horse' },
      { name: 'Gucci', gender: 'G', category: 'Livery Horse' },
      { name: 'Hanna', gender: 'M', category: 'Livery Horse' },
      { name: 'Madame', gender: 'M', category: 'Livery Horse' },

      // ===== PONIES (15) =====
      { name: 'Napoleon', gender: 'G', category: 'Pony' },
      { name: 'Appache', gender: 'G', category: 'Pony' },
      { name: 'P.Pan', gender: 'G', category: 'Pony' },
      { name: 'Valentine', gender: 'M', category: 'Pony' },
      { name: 'T.Bell', gender: 'M', category: 'Pony' },
      { name: 'Majnu', gender: 'G', category: 'Pony' },
      { name: 'Red Velvet', gender: 'G', category: 'Pony' },
      { name: 'Rusty', gender: 'G', category: 'Pony' },
      { name: 'Lola', gender: 'M', category: 'Pony' },
      { name: 'Adorabella', gender: 'M', category: 'Pony' },
      { name: 'Dazzle', gender: 'G', category: 'Pony' },
      { name: 'Simba', gender: 'G', category: 'Pony' },
      { name: 'The Queen', gender: 'M', category: 'Pony' },
      { name: 'Olivia', gender: 'M', category: 'Pony' },
      { name: 'Carmel', gender: 'G', category: 'Pony' },

      // ===== BREEDING (11) =====
      { name: 'Pilatus', gender: 'S', category: 'Breeding' },
      { name: 'Jufa', gender: 'M', category: 'Breeding' },
      { name: 'Capinera Alfabia', gender: 'M', category: 'Breeding' },
      { name: 'Caraida', gender: 'M', category: 'Breeding' },
      { name: 'Golden Lady', gender: 'M', category: 'Breeding' },
      { name: 'Bianco', gender: 'S', category: 'Breeding' },
      { name: 'Rebelde Al Alfabia', gender: 'S', category: 'Breeding' },
      { name: 'Cariana Z (KARA)', gender: 'M', category: 'Breeding' },
      { name: 'Quintina', gender: 'M', category: 'Breeding' },
      { name: 'Lumbini', gender: 'G', category: 'Breeding' },
      { name: 'Tamara', gender: 'M', category: 'Breeding' },
    ]

    // First, delete all existing horses (and cascade)
    await prisma.horseFeed.deleteMany({})
    await prisma.inspectionRound.deleteMany({})
    await prisma.workSheetEntry.deleteMany({})
    await prisma.instructorDailyWorkRecord.deleteMany({})
    await prisma.horseCareTeam.deleteMany({})
    await prisma.medicineLog.deleteMany({})
    await prisma.healthRecord.deleteMany({})
    // Delete expenses linked to horses
    await prisma.expense.updateMany({ where: { horseId: { not: null } }, data: { horseId: null } })
    // Delete tasks linked to horses
    await prisma.task.deleteMany({ where: { horseId: { not: null } } })
    await prisma.horse.deleteMany({})
    
    console.log('Cleared existing horses')

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const horse of allHorses) {
      try {
        const gender = genderMap[horse.gender] || 'Male'
        
        await prisma.horse.create({
          data: {
            name: horse.name,
            gender: gender,
            dateOfBirth: new Date('2015-01-01'), // Default DOB
            breed: horse.category,  // Using breed field to store category
            status: 'Active',
            location: horse.category,
            stableNumber: `${horse.category.substring(0, 2).toUpperCase()}-${String(created + 1).padStart(3, '0')}`,
          }
        })
        created++
      } catch (err: any) {
        skipped++
        errors.push(`${horse.name}: ${err.message}`)
      }
    }

    const summary = {
      total: allHorses.length,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      breakdown: {
        schoolHorses: allHorses.filter(h => h.category === 'School Horse').length,
        trainingShowHorses: allHorses.filter(h => h.category === 'Training/Show Horse').length,
        liveryHorses: allHorses.filter(h => h.category === 'Livery Horse').length,
        ponies: allHorses.filter(h => h.category === 'Pony').length,
        breeding: allHorses.filter(h => h.category === 'Breeding').length,
      }
    }

    console.log('🐴 Horse seeding complete:', summary)
    return res.status(200).json({ success: true, ...summary })
  } catch (error: any) {
    console.error('Error seeding horses:', error)
    return res.status(500).json({ error: error.message })
  }
}
