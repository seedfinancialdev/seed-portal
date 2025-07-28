import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, type UpdateProfile } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Camera, 
  RefreshCw,
  Info,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  Zap
} from "lucide-react";
import navLogoPath from "@assets/Seed Financial Logo (1)_1753043325029.png";
import { useState, useEffect, useRef, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WeatherData {
  temperature: number | null;
  condition: string;
  location: string;
  isLoading: boolean;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  location: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [weather, setWeather] = useState<WeatherData>({
    temperature: null,
    condition: '',
    location: user?.city && user?.state ? `${user.city}, ${user.state}` : 'Marina Del Rey, CA',
    isLoading: false
  });

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phoneNumber: user?.phoneNumber || '',
      profilePhoto: user?.profilePhoto || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zipCode: user?.zipCode || '',
      country: user?.country || 'US',
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phone number formatting function
  const formatPhoneNumber = useCallback((value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Don't format if empty
    if (!phoneNumber) return '';
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length >= 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    } else if (phoneNumber.length >= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    } else if (phoneNumber.length >= 3) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return phoneNumber;
    }
  }, []);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: formatPhoneNumber(user.phoneNumber || ''),
        profilePhoto: user.profilePhoto || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        country: user.country || 'US',
      });
      
      // If user has address but no coordinates, geocode and fetch weather
      if (user.address && user.city && user.state && (!user.latitude || !user.longitude)) {
        console.log('Address exists but coordinates missing, fetching weather...');
        fetchWeatherForAddress(user.address, user.city, user.state, user.zipCode || '');
      }
    }
  }, [user, form, formatPhoneNumber]);

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch('/api/user/upload-photo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Update the form and user data
        form.setValue('profilePhoto', result.photoUrl);
        queryClient.setQueryData(['/api/user'], (oldData: any) => ({
          ...oldData,
          profilePhoto: result.photoUrl
        }));
        
        // Also invalidate and refetch to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        await queryClient.refetchQueries({ queryKey: ['/api/user'] });
        
        toast({
          title: "Success",
          description: "Profile photo updated successfully",
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Geocoding service to convert address to coordinates
  const geocodeAddress = async (address: string, city: string, state: string, zipCode: string): Promise<GeocodeResult | null> => {
    try {
      // Known coordinates for common cities to avoid API issues
      const knownLocations: Record<string, { latitude: number; longitude: number }> = {
        'Marina Del Rey, CA': { latitude: 33.9802, longitude: -118.4517 },
        'Los Angeles, CA': { latitude: 34.0522, longitude: -118.2437 },
        'San Francisco, CA': { latitude: 37.7749, longitude: -122.4194 },
        'New York, NY': { latitude: 40.7128, longitude: -74.0060 },
        'Chicago, IL': { latitude: 41.8781, longitude: -87.6298 },
      };
      
      const cityStateKey = `${city}, ${state}`;
      console.log('Looking up coordinates for:', cityStateKey);
      
      // Check if we have known coordinates first
      if (knownLocations[cityStateKey]) {
        const coords = knownLocations[cityStateKey];
        console.log('Using known coordinates:', coords);
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          location: cityStateKey
        };
      }
      
      // Fall back to API for unknown locations
      console.log('Geocoding via API:', cityStateKey);
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityStateKey)}&count=1&language=en&format=json`
      );
      
      if (!response.ok) {
        console.error('Geocoding API error:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.warn('No geocoding results found for:', cityStateKey);
        return null;
      }
      
      const result = data.results[0];
      console.log('Geocoding API success:', { latitude: result.latitude, longitude: result.longitude });
      
      return {
        latitude: result.latitude,
        longitude: result.longitude,
        location: cityStateKey
      };
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  };

  // Fetch weather based on coordinates
  const fetchWeatherByCoordinates = async (lat: number, lon: number, location: string) => {
    try {
      setWeather(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
      );
      
      if (!response.ok) throw new Error('Weather fetch failed');
      
      const data = await response.json();
      const currentWeather = data.current_weather;
      
      const getCondition = (code: number) => {
        if (code === 0) return 'clear';
        if (code <= 3) return 'partly cloudy';
        if (code <= 48) return 'cloudy';
        if (code <= 67) return 'rainy';
        if (code <= 77) return 'snowy';
        if (code <= 82) return 'showers';
        return 'stormy';
      };
      
      setWeather({
        temperature: Math.round(currentWeather.temperature),
        condition: getCondition(currentWeather.weathercode),
        location,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      setWeather(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Combined address fetch function
  const fetchWeatherForAddress = async (address: string, city: string, state: string, zipCode: string) => {
    const geocodeResult = await geocodeAddress(address, city, state, zipCode);
    if (geocodeResult) {
      // Save coordinates to database
      try {
        await apiRequest('PATCH', '/api/user/profile', {
          latitude: geocodeResult.latitude.toString(),
          longitude: geocodeResult.longitude.toString(),
        });
      } catch (error) {
        console.error('Failed to save coordinates:', error);
      }
      
      await fetchWeatherByCoordinates(
        geocodeResult.latitude,
        geocodeResult.longitude,
        geocodeResult.location
      );
    }
  };

  // Fetch weather when form values change OR when user data loads
  useEffect(() => {
    const address = form.watch('address') || user?.address;
    const city = form.watch('city') || user?.city;
    const state = form.watch('state') || user?.state;
    const zipCode = form.watch('zipCode') || user?.zipCode;
    
    if (address && city && state && zipCode) {
      fetchWeatherForAddress(address, city, state, zipCode);
    }
  }, [form.watch('address'), form.watch('city'), form.watch('state'), form.watch('zipCode'), user?.address, user?.city, user?.state, user?.zipCode]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await apiRequest('PATCH', '/api/user/profile', data);
      return response.json();
    },
    onSuccess: async (updatedUser, variables) => {
      // If address was updated, geocode and save coordinates to database
      if (variables.address || variables.city || variables.state) {
        const geocodeResult = await geocodeAddress(
          variables.address || '',
          variables.city || '',
          variables.state || '',
          variables.zipCode || ''
        );
        
        if (geocodeResult) {
          // Save coordinates to database
          try {
            await apiRequest('PATCH', '/api/user/profile', {
              latitude: geocodeResult.latitude.toString(),
              longitude: geocodeResult.longitude.toString(),
            });
            
            // Fetch weather with new coordinates
            await fetchWeatherByCoordinates(
              geocodeResult.latitude,
              geocodeResult.longitude,
              geocodeResult.location
            );
          } catch (error) {
            console.error('Failed to save coordinates:', error);
          }
        }
      }
      
      // Force refresh user data immediately after all updates
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // HubSpot sync mutation
  const syncHubSpotMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/user/sync-hubspot', {});
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "HubSpot sync completed",
        description: `Updated: ${data.syncedFields?.join(', ') || 'No changes'}`,
      });
      // Force refresh user data immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed", 
        description: error.message || "Failed to sync with HubSpot",
        variant: "destructive",
      });
    },
  });

  // Load weather on component mount if coordinates exist
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      const location = user.city && user.state ? `${user.city}, ${user.state}` : 'Unknown Location';
      fetchWeatherByCoordinates(
        parseFloat(user.latitude),
        parseFloat(user.longitude),
        location
      );
    }
  }, [user?.latitude, user?.longitude]);

  const onSubmit = (data: UpdateProfile) => {
    updateProfileMutation.mutate(data);
  };

  const getWeatherIcon = (condition: string) => {
    const iconProps = { className: "h-4 w-4 text-blue-600" };
    
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun {...iconProps} className="h-4 w-4 text-yellow-500" />;
      case 'partly cloudy':
        return <Cloud {...iconProps} className="h-4 w-4 text-gray-500" />;
      case 'cloudy':
        return <Cloud {...iconProps} className="h-4 w-4 text-gray-600" />;
      case 'rainy':
        return <CloudRain {...iconProps} />;
      case 'showers':
        return <CloudDrizzle {...iconProps} />;
      case 'snowy':
        return <CloudSnow {...iconProps} />;
      case 'stormy':
        return <Zap {...iconProps} />;
      default:
        return <Cloud {...iconProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#253e31] to-[#75c29a]">
      {/* Header */}
      <header className="bg-transparent py-4">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Back Button */}
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:text-orange-200 hover:bg-white/10 backdrop-blur-sm border border-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
            
            {/* Centered Logo */}
            <div className="flex-1 flex justify-center">
              <img 
                src={navLogoPath} 
                alt="Seed Financial" 
                className="h-16 w-auto"
              />
            </div>
            
            {/* Spacer for balance */}
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light text-white mb-2">My Profile</h1>
          <p className="text-white/70">Manage your personal information and preferences</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Information Card */}
          <div className="md:col-span-2">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <User className="h-5 w-5 text-orange-500" />
                  Profile Information
                </CardTitle>

              </CardHeader>
              <CardContent className="space-y-6">


                {/* HubSpot Synced Fields (Read-Only) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">HubSpot Profile Data</h3>
                    <Button 
                      onClick={() => syncHubSpotMutation.mutate()}
                      disabled={syncHubSpotMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncHubSpotMutation.isPending ? 'animate-spin' : ''}`} />
                      {syncHubSpotMutation.isPending ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-gray-700">First Name</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          id="firstName"
                          value={user?.firstName || ''} 
                          disabled 
                          className="bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                      <Input 
                        id="lastName"
                        value={user?.lastName || ''} 
                        disabled 
                        className="bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-700">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <Input 
                        id="email"
                        value={user?.email || ''} 
                        disabled 
                        className="bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Editable Fields */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Phone Number Field */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700">Contact Information</h3>

                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(555) 555-5555" 
                                {...field}
                                onChange={(e) => {
                                  const formatted = formatPhoneNumber(e.target.value);
                                  field.onChange(formatted);
                                }}
                                className="bg-white border-gray-200"
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Address Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700">Address & Location</h3>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Main Street" 
                              {...field} 
                              className="bg-white border-gray-200"
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Marina Del Rey" 
                                {...field}
                                className="bg-white border-gray-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="CA" 
                                {...field}
                                className="bg-white border-gray-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="90292" 
                                {...field}
                                className="bg-white border-gray-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="US" 
                                {...field}
                                className="bg-white border-gray-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                      Update Profile
                    </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Weather Preview Card */}
          <div className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  Live Weather
                </CardTitle>
                <CardDescription>
                  Current weather conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weather.isLoading ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading weather...</span>
                  </div>
                ) : weather.temperature ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getWeatherIcon(weather.condition)}
                      <span className="text-2xl font-bold text-gray-900">
                        {weather.temperature}°F
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{weather.condition}</p>
                    <p className="text-xs text-gray-500 mt-1">{weather.location}</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <Cloud className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Add your address to see weather</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Photo */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Camera className="h-5 w-5 text-gray-600" />
                  Profile Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="relative">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                      {user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="photo-upload"
                      onChange={handlePhotoUpload}
                    />
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md cursor-pointer transition-colors"
                    >
                      <Camera className="h-3 w-3" />
                      Change Photo
                    </label>
                    <p className="text-xs text-gray-500">
                      Upload a new profile photo (5mb max)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}