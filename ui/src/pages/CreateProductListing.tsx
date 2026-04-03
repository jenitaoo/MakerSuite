import { useNavigate, useBlocker } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { getCookie } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type FormValues = {
  title: string;
  description: string;
  internal_price: string;
  internal_quantity: number;
  sku: string;
  tags: string;
  materials: string;
  who_made: string;
  when_made: string;
  listing_type: string;
  should_auto_renew: boolean;
  is_taxable: boolean;
};

export default function CreateProductListing() {
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      internal_price: "",
      internal_quantity: 0,
      sku: "",
      tags: "",
      materials: "",
      who_made: "i_did",
      when_made: "made_to_order",
      listing_type: "physical",
      should_auto_renew: true,
      is_taxable: true,
    },
  });

  const { formState: { isDirty, isSubmitting } } = form;

  const blocker = useBlocker(isDirty && !isSubmitting);
  if (blocker.state === "blocked") {
    const confirmed = window.confirm("You have unsaved changes. Leave anyway?");
    if (confirmed) blocker.proceed();
    else blocker.reset();
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/products/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          internal_price: values.internal_price || null,
          internal_quantity: values.internal_quantity,
          sku: values.sku || null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success("Product created");
      navigate(`/products/${data.id}/edit`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create product");
    }
  };

  const title = form.watch("title");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <button
          type="button"
          className="text-white text-sm mb-2 hover:underline"
          onClick={() => navigate("/crosslist")}
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white">
          {title.trim() || "Create New MakerSuite Product"}
        </h1>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-[#b5af8d] px-4 py-3 text-sm text-white">
        <span>𝐢</span>
        <p>
          Create and save your product here first<br></br>
          Then use the editor to save your product to other platforms (e.g. Etsy or Shopify)
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Internal Fields */}
          <Card className="bg-[#fdf8f6]">
            <CardHeader>
              <CardTitle>Internal Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Product title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Product description" rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="internal_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internal_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. WHI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Etsy Fields */}
          <Card className="bg-[#fdf8f6]">
            <CardHeader>
              <CardTitle>
                Etsy Fields{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  optional — fill in if publishing to Etsy later
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Handmade, Jewellery, Gift" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="materials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Materials</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Seed Beads, Glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="who_made"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who Made</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="i_did">I did</SelectItem>
                          <SelectItem value="someone_else">Someone else</SelectItem>
                          <SelectItem value="collective">A collective</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="when_made"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When Made</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="made_to_order">Made to order</SelectItem>
                          <SelectItem value="2020_2025">2020–2025</SelectItem>
                          <SelectItem value="2010_2019">2010–2019</SelectItem>
                          <SelectItem value="2000_2009">2000–2009</SelectItem>
                          <SelectItem value="before_2000">Before 2000</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="listing_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listing Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="digital">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="should_auto_renew"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label>Auto Renew</Label>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_taxable"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label>Taxable</Label>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => navigate("/crosslist")}
            >
              Cancel
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}