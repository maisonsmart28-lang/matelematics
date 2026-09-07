"use client";

export default function ContactPage() {
  return (
    <section
      id="contact"
      className="py-24 bg-white"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-slate-50 rounded-3xl p-10 shadow-lg">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Contactez-nous
          </h2>

          <p className="text-gray-600 mb-8">
            Besoin d&apos;informations sur nos solutions de t&eacute;l&eacute;matique,
            GPS, IoT ou gestion de flotte ?
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              placeholder="Nom"
              className="
                w-full
                p-4
                rounded-xl
                border
                bg-white
                text-gray-900
              "
            />
            <input
              type="email"
              placeholder="Email"
              className="
                w-full
                p-4
                rounded-xl
                border
                bg-white
                text-gray-900
              "
            />
          </div>

          <textarea
            placeholder="Votre message"
            rows={5}
            className="
              w-full
              mt-6
              p-4
              rounded-xl
              border
              bg-white
              text-gray-900
            "
          ></textarea>

          <button
            type="button"
            onClick={() => {
              const name =
                (
                  document.querySelector<HTMLInputElement>(
                    'input[placeholder="Nom"]'
                  )
                )?.value ?? "";

              const email =
                (
                  document.querySelector<HTMLInputElement>(
                    'input[placeholder="Email"]'
                  )
                )?.value ?? "";

              const message =
                (
                  document.querySelector<HTMLTextAreaElement>(
                    'textarea[placeholder="Votre message"]'
                  )
                )?.value ?? "";

              const subject =
                encodeURIComponent(
                  "Demande Matelematics - " +
                  (name || "Contact")
                );

              const body =
                encodeURIComponent(
                  "Nom : " + name +
                  "\nEmail : " + email +
                  "\n\nMessage :\n" +
                  message
                );

              window.location.href =
                "mailto:contact@matelematics.ma" +
                "?subject=" +
                subject +
                "&body=" +
                body;
            }}
            className="
              mt-6
              bg-blue-600
              text-white
              px-8
              py-4
              rounded-xl
              hover:bg-blue-700
              transition
            "
          >
            Envoyer
          </button>

          <div className="mt-8 text-gray-700">
            <p>
              ðŸ“ž 0669154235
            </p>
            <p>
              âœ‰ï¸ contact@matelematics.ma
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
