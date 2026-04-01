import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground mb-12">Last Updated: October 2026</p>

            <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none text-muted-foreground">
              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">1. Information We Collect</h2>
              <p className="mb-6 leading-relaxed">
                When you use Webuild, we collect information that you provide to us directly, such as when you create an account, update your profile, submit a project, or communicate with us. This may include your name, email address, school affiliation, and professional skills.
              </p>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">2. How We Use Your Information</h2>
              <p className="mb-4 leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>Provide, maintain, and improve our platform.</li>
                <li>Match you with relevant projects and opportunities.</li>
                <li>Verify your academic or professional credentials.</li>
                <li>Communicate with you regarding updates, security alerts, and support.</li>
              </ul>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">3. Sharing of Information</h2>
              <p className="mb-6 leading-relaxed">
                We do not sell your personal information. We may share your information with third-party service providers that assist us in operating our platform, conducting our business, or serving our users, so long as those parties agree to keep this information confidential.
              </p>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">4. Data Security</h2>
              <p className="mb-6 leading-relaxed">
                We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet, or method of electronic storage, is 100% secure.
              </p>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">5. Contact Us</h2>
              <p className="mb-6 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@webuild.app" className="text-primary hover:underline">privacy@webuild.app</a>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
