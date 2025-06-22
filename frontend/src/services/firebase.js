import app, { db } from "../config/firebase"
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore"

export class FirebaseService {
  constructor() {
    this.db = db
    this.appId = "plantpal-3d"
  }

  // Get plant document reference
  getPlantDocRef(userId) {
    return doc(this.db, "artifacts", this.appId, "public", "data", "plants", userId)
  }

  // Listen to plant data changes
  listenToPlantData(userId, callback) {
    const plantDocRef = this.getPlantDocRef(userId)

    return onSnapshot(
      plantDocRef,
      (doc) => {
        if (doc.exists()) {
          callback(doc.data())
        } else {
          callback(null)
        }
      },
      (error) => {
        console.error("Error listening to plant data:", error)
        callback(null)
      },
    )
  }

  // Update plant data
  async updatePlantData(userId, plantData) {
    try {
      const plantDocRef = this.getPlantDocRef(userId)
      await setDoc(
        plantDocRef,
        {
          ...plantData,
          lastUpdated: new Date().toISOString(),
          userId: userId,
        },
        { merge: true },
      )

      console.log("Plant data updated in Firestore")
    } catch (error) {
      console.error("Error updating plant data:", error)
      throw error
    }
  }

  // Get plant data once
  async getPlantData(userId) {
    try {
      const plantDocRef = this.getPlantDocRef(userId)
      const docSnap = await getDoc(plantDocRef)

      if (docSnap.exists()) {
        return docSnap.data()
      } else {
        return null
      }
    } catch (error) {
      console.error("Error getting plant data:", error)
      return null
    }
  }

  // Get all public plants (for discovery)
  async getAllPublicPlants() {
    try {
      // This would require a different structure for efficient querying
      // For now, we'll return empty array
      return []
    } catch (error) {
      console.error("Error getting public plants:", error)
      return []
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService()
export default FirebaseService