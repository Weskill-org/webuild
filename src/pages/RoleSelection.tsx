import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, GraduationCap, Building2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RoleSelection = () => {
  const navigate = useNavigate();

  const roles = [
    {
      icon: GraduationCap,
      title: "Student / Freelancer",
      description: "Learn practical skills, work on real projects, and earn while you grow",
      color: "from-blue-500 to-blue-600",
      path: "/signup?role=student"
    },
    {
      icon: Briefcase,
      title: "Company",
      description: "Find talented students and freelancers for your projects",
      color: "from-purple-500 to-purple-600",
      path: "/signup?role=company"
    },
    {
      icon: Building2,
      title: "Campus",
      description: "Connect your students with industry opportunities and track their progress",
      color: "from-green-500 to-green-600",
      path: "/signup?role=campus"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Join Webuild</h1>
          <p className="text-muted-foreground text-lg">Choose your role to get started</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <Card
              key={index}
              className="p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 hover:-translate-y-2 group"
              onClick={() => navigate(role.path)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <role.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{role.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">{role.description}</p>
              <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                Continue as {role.title.split(' ')[0]}
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Already have an account?{" "}
          <button 
            onClick={() => navigate("/login")}
            className="text-primary hover:underline font-medium"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default RoleSelection;