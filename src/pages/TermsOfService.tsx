import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground mb-12">Last Updated: October 2026</p>

            <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none text-muted-foreground">
              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">1. Acceptance of Terms</h2>
              <p className="mb-6 leading-relaxed">
                By accessing and using Webuild, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
              </p>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">2. User Accounts</h2>
              <p className="mb-6 leading-relaxed">
                You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">3. Platform Usage</h2>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>You agree to use the platform only for lawful purposes.</li>
                <li>You agree not to post false, misleading, or defamatory content.</li>
                <li>You agree not to interfere with or disrupt the security or performance of the platform.</li>
                <li>You agree not to scrape, data mine, or harvest any data from Webuild without our explicit permission.</li>
              </ul>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">4. Intellectual Property</h2>
              <p className="mb-6 leading-relaxed">
                All content on Webuild, including text, graphics, logos, and software, is the property of Webuild or its content suppliers and is protected by intellectual property laws. Users retain ownership of the projects they create but grant Webuild a license to host and display them on the platform.
              </p>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">5. Limitation of Liability</h2>
              <p className="mb-6 leading-relaxed">
                Webuild is provided "as is" without any warranties. We shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use our platform.
              </p>

              <h2 className="text-foreground text-2xl font-bold mt-10 mb-4">6. Contact Us</h2>
              <p className="mb-6 leading-relaxed">
                If you have any questions about these Terms, please contact us at <a href="mailto:legal@webuild.app" className="text-primary hover:underline">legal@webuild.app</a>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
