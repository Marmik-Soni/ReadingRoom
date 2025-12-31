export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            📖 The Reading Room
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            A community of readers gathering every Sunday to share stories, insights, and the joy of
            reading.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="#"
              className="rounded-md bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Join the Community
            </a>
            <a
              href="#"
              className="text-sm leading-6 font-semibold text-gray-900 hover:text-gray-700"
            >
              Our Story <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {/* Feature Section */}
        <div className="mx-auto mt-32 max-w-2xl sm:mt-40">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Simple, fair, and designed to bring readers together.
            </p>
          </div>

          <div className="mt-16 space-y-8">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black font-semibold text-white">
                1
              </div>
              <div>
                <h3 className="text-base leading-7 font-semibold text-gray-900">
                  Register on Monday
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Registration opens every Monday at 9 AM IST. First come, first served.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black font-semibold text-white">
                2
              </div>
              <div>
                <h3 className="text-base leading-7 font-semibold text-gray-900">
                  Get Your Invitation
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  The first 100 registrants receive an invitation. You have 24 hours to confirm.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black font-semibold text-white">
                3
              </div>
              <div>
                <h3 className="text-base leading-7 font-semibold text-gray-900">Join Us Sunday</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Bring your favorite book and meet fellow readers at the venue.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} The Reading Room. Built with ❤️ for the community.
          </p>
        </footer>
      </main>
    </div>
  );
}
