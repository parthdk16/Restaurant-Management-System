import { FC, useEffect, useState } from "react";
import { ArrowRight, Clock, MapPin, Phone, Instagram, Facebook, Star, ChevronRight, MessageSquare, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from '@/assets/logoLandscape.png';

export const RestaurantLandingPage: FC = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [specialties, setSpecialties] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Hotel Shripad';
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch specialties from Firestore
      const specialtiesSnapshot = await db.collection('specialties').get();
      const specialtiesData = specialtiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSpecialties(specialtiesData);

      // Fetch testimonials from Firestore
      const testimonialsSnapshot = await db.collection('testimonials').get();
      const testimonialsData = testimonialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTestimonials(testimonialsData);

      // Fetch features from Firestore
      const featuresSnapshot = await db.collection('features').get();
      const featuresData = featuresSnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert icon string to component
        const iconComponent = getIconComponent(data.iconName);
        return {
          id: doc.id,
          ...data,
          icon: iconComponent
        };
      });
      setFeatures(featuresData);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  // Function to convert icon name strings to components
  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'Clock':
        return <Clock className="size-8" />;
      case 'Star':
        return <Star className="size-8" />;
      case 'MessageSquare':
        return <MessageSquare className="size-8" />;
      default:
        return <Star className="size-8" />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-teal-600 border-teal-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-teal-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-amber-50 to-white">
      {/* Header with Auth Buttons */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <img src={logo} alt="Hotel Shripad" className="h-10" />
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              className="border-teal-600 text-teal-600 hover:bg-teal-50"
              onClick={() => window.location.href = '/login'}
            >
              <LogIn className="mr-2 size-4" /> Login
            </Button>
            <Button 
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => window.location.href = '/signup'}
            >
              <UserPlus className="mr-2 size-4" /> Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/api/placeholder/1920/1080')] bg-cover bg-center opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 space-y-6 lg:ml-24">
              <img src={logo} alt="Hotel Shripad" className="h-16 mb-8" />
              <h1 className="text-5xl md:text-6xl font-bold text-emerald-950">
                Experience <span className="text-teal-600">Authentic</span> Indian Cuisine
              </h1>
              <p className="text-lg text-gray-700 max-w-md">
                Discover the rich flavors of traditional Indian dishes prepared with love and served with care at Hotel Shripad.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="lg" onClick={() => window.open('/food-order', '_blank')} className="bg-teal-600 hover:bg-teal-700">
                  Order Online <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button size="lg" onClick={() => window.open('/food-order', '_blank')} variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
                  Explore Menu
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-teal-100 border-2 border-white overflow-hidden">
                      <img src={`/api/placeholder/32/32?text=${i}`} alt="Customer" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="size-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="ml-2 font-medium">4.8</span>
                  </div>
                  <p className="text-sm text-gray-500">Based on 500+ reviews</p>
                </div>
              </div>
            </div>
            <div className="mt-12 md:mt-0 md:w-1/2 flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 md:w-80 md:h-80 bg-teal-100 rounded-full absolute top-0 left-0 transform -translate-x-1/4 -translate-y-1/4" />
                <div className="w-48 h-48 md:w-64 md:h-64 bg-amber-100 rounded-full absolute bottom-0 right-0 transform translate-x-1/4 translate-y-1/4" />
                <img 
                  src="https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_660/fa4944f0cfdcbca2bec1f3ab8e3db3f7" 
                  alt="Featured Dish" 
                  className="w-80 h-80 object-cover rounded-full relative z-10 border-8 border-white shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div 
                key={feature.id} 
                className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-xl shadow-sm border border-teal-100 text-center"
              >
                <div className="mx-auto bg-teal-100 w-16 h-16 flex items-center justify-center rounded-full text-teal-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Specialties</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover our chef's signature dishes that have won the hearts of our customers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialties.map((dish, index) => (
              <div 
                key={dish.id} 
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="h-48 bg-gray-100">
                  <img 
                    src={`https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_660/fa4944f0cfdcbca2bec1f3ab8e3db3f7`} 
                    alt={'Featured Dish'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className={`w-3 h-3 rounded-full ${dish.isVeg ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                      <h3 className="font-semibold text-lg">{dish.name}</h3>
                    </div>
                    <div className="flex items-center bg-amber-50 px-2 py-1 rounded text-amber-700">
                      <Star className="size-3 fill-amber-500 text-amber-500 mr-1" />
                      <span className="text-sm font-medium">{dish.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{dish.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">₹{dish.price}</span>
                    <Button variant="outline" size="sm" className="text-teal-600 border-teal-600 hover:bg-teal-50">
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button className="bg-teal-600 hover:bg-teal-700">
              View Full Menu <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Don't just take our word for it - hear what our valued customers have to say about their experience
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {testimonials.length > 0 && (
              <div className="bg-white p-8 rounded-xl shadow-md">
                <div className="flex justify-center mb-6">
                  {Array.from({ length: testimonials[activeTestimonial]?.rating || 5 }).map((_, i) => (
                    <Star key={i} className="size-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-center text-xl italic text-gray-700 mb-6">
                  "{testimonials[activeTestimonial]?.comment}"
                </blockquote>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-teal-100 mr-4">
                    <img 
                      src={testimonials[activeTestimonial]?.imageUrl || `/api/placeholder/48/48?text=${activeTestimonial}`} 
                      alt="Customer" 
                      className="rounded-full w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{testimonials[activeTestimonial]?.name}</p>
                    <p className="text-sm text-gray-500">Happy Customer</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full mx-1 ${
                    activeTestimonial === index ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-teal-600 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to taste our delicious food?</h2>
              <p className="text-teal-100 max-w-md">
                Order online now and enjoy our authentic Indian cuisine at your home or visit us for a delightful dining experience.
              </p>
            </div>
            <div className="md:w-1/2 flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
                Reserve a Table
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-teal-700">
                Order Online
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 text-white pt-12 pb-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <img src={logo} alt="Hotel Shripad" className="h-12 mb-4" />
              <p className="text-emerald-200 mb-4">
                Experience authentic Indian cuisine with a perfect blend of traditional flavors and modern presentation.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-white hover:text-teal-300">
                  <Instagram className="size-5" />
                </a>
                <a href="#" className="text-white hover:text-teal-300">
                  <Facebook className="size-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <MapPin className="size-5 mr-2 mt-1 text-teal-400" />
                  <p className="text-emerald-200">123 Main Street, Pune, Maharashtra, 411001</p>
                </div>
                <div className="flex items-center">
                  <Phone className="size-5 mr-2 text-teal-400" />
                  <p className="text-emerald-200">+91 98765 43210</p>
                </div>
                <div className="flex items-center">
                  <Clock className="size-5 mr-2 text-teal-400" />
                  <p className="text-emerald-200">Open daily: 11:00 AM - 11:00 PM</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-emerald-200 hover:text-white">Home</a></li>
                <li><a href="#" className="text-emerald-200 hover:text-white">Menu</a></li>
                <li><a href="#" className="text-emerald-200 hover:text-white">Order Online</a></li>
                <li><a href="#" className="text-emerald-200 hover:text-white">About Us</a></li>
                <li><a href="#" className="text-emerald-200 hover:text-white">Contact</a></li>
                <li><a href="/login" className="text-emerald-200 hover:text-white">Login</a></li>
                <li><a href="/signup" className="text-emerald-200 hover:text-white">Sign Up</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-emerald-800 pt-6 text-center text-emerald-300 text-sm">
            <p>© {new Date().getFullYear()} Hotel Shripad. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// import { FC, useEffect, useState } from "react";
// import { ArrowRight, Clock, MapPin, Phone, Instagram, Facebook, Star, ChevronRight, MessageSquare } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import logo from '@/assets/logoLandscape.png';

// export const RestaurantLandingPage: FC = () => {
//   const [activeTestimonial, setActiveTestimonial] = useState(0);

//   useEffect(() => {
//       document.title = 'Hotel Shripad';
//     }, []);

//   // Sample data
//   const specialties = [
//     { name: "Paneer Butter Masala", price: 250, isVeg: true, rating: 4.8, description: "Soft paneer cubes in rich creamy tomato gravy" },
//     { name: "Butter Chicken", price: 280, isVeg: false, rating: 4.9, description: "Tender chicken cooked in creamy tomato gravy" },
//     { name: "Maharashtrian Thali", price: 320, isVeg: true, rating: 4.7, description: "Complete meal with variety of authentic Maharashtrian delicacies" },
//     { name: "Fish Curry", price: 290, isVeg: false, rating: 4.6, description: "Fresh fish in coconut based tangy gravy" }
//   ];

//   const testimonials = [
//     { name: "Rahul Sharma", comment: "Best authentic Indian food in town! Their paneer dishes are absolutely divine.", rating: 5 },
//     { name: "Anjali Patil", comment: "The Maharashtrian Thali is a must-try. Such authentic flavors that remind me of my grandmother's cooking.", rating: 5 },
//     { name: "Rohit Desai", comment: "Great ambiance and even better food. The staff is very courteous and the service is prompt.", rating: 4 }
//   ];

//   const features = [
//     { icon: <Clock className="size-8" />, title: "Fast Delivery", description: "Hot food delivered at your doorstep within 30 minutes" },
//     { icon: <Star className="size-8" />, title: "Quality Food", description: "Prepared with fresh ingredients and authentic spices" },
//     { icon: <MessageSquare className="size-8" />, title: "Excellent Service", description: "Our friendly staff is always ready to assist you" }
//   ];

//   return (
//     <div className="bg-gradient-to-b from-amber-50 to-white">
//       {/* Hero Section */}
//       <section className="relative h-screen flex items-center bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
//         <div className="absolute inset-0 bg-[url('/api/placeholder/1920/1080')] bg-cover bg-center opacity-20" />
//         <div className="container mx-auto px-4 relative z-10">
//           <div className="flex flex-col md:flex-row items-center">
//             <div className="md:w-1/2 space-y-6">
//               <img src={logo} alt="Hotel Shripad" className="h-16 mb-8" />
//               <h1 className="text-5xl md:text-6xl font-bold text-emerald-950">
//                 Experience <span className="text-teal-600">Authentic</span> Indian Cuisine
//               </h1>
//               <p className="text-lg text-gray-700 max-w-md">
//                 Discover the rich flavors of traditional Indian dishes prepared with love and served with care at Hotel Shripad.
//               </p>
//               <div className="flex flex-wrap gap-4 pt-4">
//                 <Button size="lg" onClick={() => window.open('/food-order', '_blank')} className="bg-teal-600 hover:bg-teal-700">
//                   Order Online <ArrowRight className="ml-2 size-4" />
//                 </Button>
//                 <Button size="lg" onClick={() => window.open('/food-order', '_blank')} variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
//                   Explore Menu
//                 </Button>
//               </div>
//               <div className="flex items-center gap-6 pt-6">
//                 <div className="flex -space-x-2">
//                   {[1, 2, 3, 4].map((i) => (
//                     <div key={i} className="w-8 h-8 rounded-full bg-teal-100 border-2 border-white overflow-hidden">
//                       <img src={`/api/placeholder/32/32?text=${i}`} alt="Customer" />
//                     </div>
//                   ))}
//                 </div>
//                 <div>
//                   <div className="flex items-center">
//                     <div className="flex">
//                       {[1, 2, 3, 4, 5].map((star) => (
//                         <Star key={star} className="size-4 fill-yellow-400 text-yellow-400" />
//                       ))}
//                     </div>
//                     <span className="ml-2 font-medium">4.8</span>
//                   </div>
//                   <p className="text-sm text-gray-500">Based on 500+ reviews</p>
//                 </div>
//               </div>
//             </div>
//             <div className="mt-12 md:mt-0 md:w-1/2 flex justify-center">
//               <div className="relative">
//                 <div className="w-64 h-64 md:w-80 md:h-80 bg-teal-100 rounded-full absolute top-0 left-0 transform -translate-x-1/4 -translate-y-1/4" />
//                 <div className="w-48 h-48 md:w-64 md:h-64 bg-amber-100 rounded-full absolute bottom-0 right-0 transform translate-x-1/4 translate-y-1/4" />
//                 <img 
//                   src="/api/placeholder/500/500" 
//                   alt="Featured Dish" 
//                   className="w-80 h-80 object-cover rounded-full relative z-10 border-8 border-white shadow-xl"
//                 />
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section className="py-16 bg-white">
//         <div className="container mx-auto px-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//             {features.map((feature, index) => (
//               <div 
//                 key={index} 
//                 className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-xl shadow-sm border border-teal-100 text-center"
//               >
//                 <div className="mx-auto bg-teal-100 w-16 h-16 flex items-center justify-center rounded-full text-teal-600 mb-4">
//                   {feature.icon}
//                 </div>
//                 <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
//                 <p className="text-gray-600">{feature.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Specialties Section */}
//       <section className="py-16 bg-gradient-to-br from-amber-50 to-orange-50">
//         <div className="container mx-auto px-4">
//           <div className="text-center mb-12">
//             <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Specialties</h2>
//             <p className="text-gray-600 max-w-2xl mx-auto">
//               Discover our chef's signature dishes that have won the hearts of our customers
//             </p>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//             {specialties.map((dish, index) => (
//               <div 
//                 key={index} 
//                 className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
//               >
//                 <div className="h-48 bg-gray-100">
//                   <img 
//                     src={`/api/placeholder/320/200?text=Food${index+1}`} 
//                     alt={dish.name}
//                     className="w-full h-full object-cover"
//                   />
//                 </div>
//                 <div className="p-6">
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="flex items-center">
//                       <span className={`w-3 h-3 rounded-full ${dish.isVeg ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
//                       <h3 className="font-semibold text-lg">{dish.name}</h3>
//                     </div>
//                     <div className="flex items-center bg-amber-50 px-2 py-1 rounded text-amber-700">
//                       <Star className="size-3 fill-amber-500 text-amber-500 mr-1" />
//                       <span className="text-sm font-medium">{dish.rating}</span>
//                     </div>
//                   </div>
//                   <p className="text-gray-600 text-sm mb-4">{dish.description}</p>
//                   <div className="flex items-center justify-between">
//                     <span className="font-semibold text-lg">₹{dish.price}</span>
//                     <Button variant="outline" size="sm" className="text-teal-600 border-teal-600 hover:bg-teal-50">
//                       Add to Cart
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="text-center mt-10">
//             <Button className="bg-teal-600 hover:bg-teal-700">
//               View Full Menu <ChevronRight className="ml-1 size-4" />
//             </Button>
//           </div>
//         </div>
//       </section>

//       {/* Testimonials Section */}
//       <section className="py-16 bg-gradient-to-br from-teal-50 to-cyan-50">
//         <div className="container mx-auto px-4">
//           <div className="text-center mb-12">
//             <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
//             <p className="text-gray-600 max-w-2xl mx-auto">
//               Don't just take our word for it - hear what our valued customers have to say about their experience
//             </p>
//           </div>

//           <div className="max-w-3xl mx-auto">
//             <div className="bg-white p-8 rounded-xl shadow-md">
//               <div className="flex justify-center mb-6">
//                 {[1, 2, 3, 4, 5].map((star) => (
//                   <Star key={star} className="size-6 fill-yellow-400 text-yellow-400" />
//                 ))}
//               </div>
//               <blockquote className="text-center text-xl italic text-gray-700 mb-6">
//                 "{testimonials[activeTestimonial].comment}"
//               </blockquote>
//               <div className="flex items-center justify-center">
//                 <div className="w-12 h-12 rounded-full bg-teal-100 mr-4">
//                   <img src={`/api/placeholder/48/48?text=${activeTestimonial}`} alt="Customer" className="rounded-full" />
//                 </div>
//                 <div>
//                   <p className="font-semibold">{testimonials[activeTestimonial].name}</p>
//                   <p className="text-sm text-gray-500">Happy Customer</p>
//                 </div>
//               </div>
//             </div>

//             <div className="flex justify-center mt-6">
//               {testimonials.map((_, index) => (
//                 <button
//                   key={index}
//                   onClick={() => setActiveTestimonial(index)}
//                   className={`w-3 h-3 rounded-full mx-1 ${
//                     activeTestimonial === index ? 'bg-teal-600' : 'bg-gray-300'
//                   }`}
//                 ></button>
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section className="py-16 bg-teal-600 text-white">
//         <div className="container mx-auto px-4">
//           <div className="flex flex-col md:flex-row items-center justify-between">
//             <div className="md:w-1/2 mb-8 md:mb-0">
//               <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to taste our delicious food?</h2>
//               <p className="text-teal-100 max-w-md">
//                 Order online now and enjoy our authentic Indian cuisine at your home or visit us for a delightful dining experience.
//               </p>
//             </div>
//             <div className="md:w-1/2 flex flex-col sm:flex-row gap-4">
//               <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50">
//                 Reserve a Table
//               </Button>
//               <Button size="lg" variant="outline" className="border-white text-white hover:bg-teal-700">
//                 Order Online
//               </Button>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="bg-emerald-950 text-white pt-12 pb-6">
//         <div className="container mx-auto px-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
//             <div>
//               <img src={logo} alt="Hotel Shripad" className="h-12 mb-4" />
//               <p className="text-emerald-200 mb-4">
//                 Experience authentic Indian cuisine with a perfect blend of traditional flavors and modern presentation.
//               </p>
//               <div className="flex space-x-4">
//                 <a href="#" className="text-white hover:text-teal-300">
//                   <Instagram className="size-5" />
//                 </a>
//                 <a href="#" className="text-white hover:text-teal-300">
//                   <Facebook className="size-5" />
//                 </a>
//               </div>
//             </div>
            
//             <div>
//               <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
//               <div className="space-y-3">
//                 <div className="flex items-start">
//                   <MapPin className="size-5 mr-2 mt-1 text-teal-400" />
//                   <p className="text-emerald-200">123 Main Street, Pune, Maharashtra, 411001</p>
//                 </div>
//                 <div className="flex items-center">
//                   <Phone className="size-5 mr-2 text-teal-400" />
//                   <p className="text-emerald-200">+91 98765 43210</p>
//                 </div>
//                 <div className="flex items-center">
//                   <Clock className="size-5 mr-2 text-teal-400" />
//                   <p className="text-emerald-200">Open daily: 11:00 AM - 11:00 PM</p>
//                 </div>
//               </div>
//             </div>
            
//             <div>
//               <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
//               <ul className="space-y-2">
//                 <li><a href="#" className="text-emerald-200 hover:text-white">Home</a></li>
//                 <li><a href="#" className="text-emerald-200 hover:text-white">Menu</a></li>
//                 <li><a href="#" className="text-emerald-200 hover:text-white">Order Online</a></li>
//                 <li><a href="#" className="text-emerald-200 hover:text-white">About Us</a></li>
//                 <li><a href="#" className="text-emerald-200 hover:text-white">Contact</a></li>
//               </ul>
//             </div>
//           </div>
          
//           <div className="border-t border-emerald-800 pt-6 text-center text-emerald-300 text-sm">
//             <p>© {new Date().getFullYear()} Hotel Shripad. All rights reserved.</p>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// };