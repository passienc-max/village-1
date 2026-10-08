import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, MessageCircle, MapPinned } from "lucide-react";
import { CATEGORIES, IMAGES, NEIGHBORHOODS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

const STEPS = [
  { icon: MapPinned, title: "Post what you need", body: "A ride to practice, a grocery run, a hand with laundry. Share only a general area." },
  { icon: MessageCircle, title: "A neighbor says yes", body: "Volunteers nearby see your request, accept it, and coordinate with you in a private chat." },
  { icon: ShieldCheck, title: "Stay safe together", body: "Profiles, reporting tools and clear safety guidelines keep the village trustworthy." },
];

const Hero = ({ user }) => (
  <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
    <div className="animate-rise">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D96838]">Klamath County · Southern Oregon</p>
      <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
        Raising kids takes a village. <span className="text-[#1E3D2F]">Here's yours.</span>
      </h1>
      <p className="mt-6 max-w-xl text-base text-stone-700 sm:text-lg">
        Parent Link connects parents and caregivers with trusted volunteer neighbors for rides, groceries, laundry, school activities and more, from Klamath Falls to Chiloquin.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to={user ? "/dashboard" : "/register?role=parent"} data-testid="hero-ask-help-btn"
          className="inline-flex items-center gap-2 rounded-lg bg-[#D96838] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#BE5527]">
          Ask for help <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to={user ? "/board" : "/register?role=volunteer"} data-testid="hero-volunteer-btn"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1E3D2F] px-6 py-3 text-sm font-semibold text-[#1E3D2F] transition-colors hover:bg-[#1E3D2F] hover:text-white">
          Become a volunteer neighbor
        </Link>
      </div>
      <div className="mt-10 flex flex-wrap gap-2">
        {CATEGORIES.map(({ value, label, icon: Icon }) => (
          <span key={value} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E3D8] bg-white px-3 py-1.5 text-sm text-stone-700">
            <Icon className="h-4 w-4 text-[#588157]" />{label}
          </span>
        ))}
      </div>
    </div>
    <div className="relative animate-rise [animation-delay:150ms]">
      <img src={IMAGES.hero} alt="Children playing outdoors together" className="aspect-[4/5] w-full rounded-2xl object-cover shadow-xl" />
      <div className="absolute -bottom-6 -left-4 max-w-[240px] rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-lg sm:-left-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#588157]">Serving</p>
        <p className="mt-1 text-sm text-stone-700">{NEIGHBORHOODS.slice(0, 7).join(" · ")} and beyond</p>
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section className="border-y border-[#E5E3D8] bg-[#F4F3EE]">
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <h2 className="max-w-lg font-heading text-3xl font-semibold tracking-tight text-stone-900">How the village works</h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E3D2F] text-white"><Icon className="h-5 w-5" /></span>
            <p className="mt-5 font-heading text-xl font-semibold text-stone-900">{i + 1}. {title}</p>
            <p className="mt-2 text-stone-600">{body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Explore = () => (
  <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2">
    {[
      { to: "/resources", title: "Local resources directory", body: "Food, housing, youth programs and crisis lines for Klamath County families.", img: IMAGES.landscape, id: "landing-resources-link" },
      { to: "/businesses", title: "Family-friendly businesses", body: "Childcare, laundromats, markets and organizations recommended by neighbors.", img: IMAGES.community, id: "landing-businesses-link" },
    ].map((c) => (
      <Link key={c.to} to={c.to} data-testid={c.id} className="group relative overflow-hidden rounded-2xl">
        <img src={c.img} alt="" className="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/85 to-transparent" />
        <div className="absolute bottom-0 p-6">
          <p className="font-heading text-2xl font-semibold text-white">{c.title}</p>
          <p className="mt-1 max-w-sm text-sm text-stone-200">{c.body}</p>
        </div>
      </Link>
    ))}
  </section>
);

export default function LandingPage() {
  const { user } = useAuth();
  return (
    <div data-testid="landing-page">
      <Hero user={user} />
      <HowItWorks />
      <Explore />
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 rounded-2xl bg-[#1E3D2F] p-8 sm:p-12 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-heading text-3xl font-semibold text-white">Have a car, an afternoon, or a casserole to spare?</h2>
            <p className="mt-3 max-w-xl text-stone-200">Volunteer neighbors make the biggest difference across our wide county. Help on your own schedule.</p>
          </div>
          <Link to={user ? "/board" : "/register?role=volunteer"} data-testid="cta-volunteer-btn" className="rounded-lg bg-[#D96838] px-6 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#BE5527]">
            Start volunteering
          </Link>
        </div>
      </section>
    </div>
  );
}
