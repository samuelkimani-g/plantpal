import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, BookOpen, Heart, Music, Users, Sparkles } from "lucide-react"

export default function LandingPage() {
  const features = [
    {
      icon: BookOpen,
      title: "Daily Journaling",
      description:
        "Express your thoughts and emotions through mindful writing. Our AI analyzes your mood to help your virtual plants grow.",
    },
    {
      icon: Leaf,
      title: "Virtual Plant Growth",
      description:
        "Watch your plants evolve based on your emotional journey. Happy thoughts create blooming flowers, while stress might cause wilting.",
    },
    {
      icon: Heart,
      title: "Mood Tracking",
      description:
        "Understand your emotional patterns over time with intelligent mood analysis and personalized insights.",
    },
    {
      icon: Music,
      title: "Music Integration",
      description:
        "Connect your Spotify or Apple Music to let your listening habits influence your plant's growth and mood.",
    },
    {
      icon: Users,
      title: "Social Garden",
      description:
        "Share your garden with friends, water each other's plants, and build a supportive community of growth.",
    },
    {
      icon: Sparkles,
      title: "Emotional DNA",
      description: "Discover your unique emotional signature through beautiful visualizations of your growth journey.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <Leaf className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-6xl font-bold text-primary">PlantPal</h1>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Grow Through What You Go Through</h2>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A gamified mindfulness app where your emotional journey nurtures virtual plants. Journal your thoughts,
            track your moods, and watch your garden flourish as you grow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link to="/register">Start Growing Today</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">Features That Help You Flourish</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            PlantPal combines mindfulness, technology, and nature to create a unique personal growth experience tailored
            just for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">How PlantPal Works</h3>
          <p className="text-lg text-muted-foreground">Your journey to mindful growth in three simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-xl font-semibold mb-2">1. Journal Daily</h4>
            <p className="text-muted-foreground">
              Write about your thoughts, feelings, and experiences. Our AI analyzes your mood.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-xl font-semibold mb-2">2. Watch Plants Grow</h4>
            <p className="text-muted-foreground">
              Your emotional state influences how your virtual plants develop and thrive.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-xl font-semibold mb-2">3. Track Growth</h4>
            <p className="text-muted-foreground">
              Monitor your emotional patterns and celebrate your personal growth journey.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-3xl mb-4">Ready to Start Your Growth Journey?</CardTitle>
            <CardDescription className="text-lg">
              Join thousands of users who are nurturing their mental health through mindful journaling and virtual plant
              care.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-3">
                <Link to="/register">Create Free Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
                <Link to="/login">I Already Have an Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Leaf className="h-5 w-5 text-primary" />
            <span>© 2024 PlantPal. Grow through what you go through.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
