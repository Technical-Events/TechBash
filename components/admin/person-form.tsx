import { deletePerson, savePerson } from "@/app/admin/(panel)/content/actions";
import { PersonPhoto } from "@/components/people/person-card";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field } from "@/components/ui/field";
import type { Person } from "@/lib/content/defaults";
import { personKinds } from "@/lib/rounds/constants";

const kindOptions = personKinds.map((kind) => ({
  value: kind,
  label: kind === "faculty" ? "Faculty" : "Student coordinator",
}));

/** Edit form for one profile, or a blank form to add one. */
export function PersonForm({
  person,
  photosEnabled,
}: {
  person?: Person;
  photosEnabled: boolean;
}) {
  const key = person?.id ?? "new";
  const fieldId = (name: string) => `${name}-${key}`;
  return (
    <div className="grid gap-6 md:grid-cols-[10rem_1fr]">
      <div className="max-w-40">
        {person ? (
          <PersonPhoto person={person} />
        ) : (
          <p className="text-sm text-muted"># New profile</p>
        )}
      </div>
      <div className="space-y-4">
        <ActionForm
          action={savePerson}
          submitLabel={person ? "Save profile" : "Add profile"}
          pendingLabel="... Saving"
          resetOnSuccess={!person}
        >
          <input type="hidden" name="personId" value={person?.id ?? ""} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id={fieldId("name")}
              label="Name"
              name="name"
              required
              maxLength={100}
              defaultValue={person?.name}
            />
            <Field
              id={fieldId("kind")}
              label="Type"
              name="kind"
              options={kindOptions}
              defaultValue={person?.kind ?? "team"}
            />
            <Field
              id={fieldId("role")}
              label="Role / designation"
              name="role"
              maxLength={100}
              defaultValue={person?.role}
            />
            <Field
              id={fieldId("department")}
              label="Department"
              name="department"
              maxLength={150}
              defaultValue={person?.department}
            />
            <Field
              id={fieldId("email")}
              label="Email"
              name="email"
              type="email"
              maxLength={254}
              defaultValue={person?.email}
            />
            <Field
              id={fieldId("phone")}
              label="Phone"
              name="phone"
              type="tel"
              maxLength={30}
              defaultValue={person?.phone}
            />
          </div>
          <Field
            id={fieldId("bio")}
            label="Profile"
            name="bio"
            multiline
            rows={3}
            maxLength={1000}
            defaultValue={person?.bio}
          />
          <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
            <Field
              id={fieldId("position")}
              label="Order"
              name="position"
              type="number"
              min={0}
              max={1000}
              defaultValue={person?.position ?? 0}
              hint="Lower numbers show first."
            />
            {photosEnabled ? (
              <Field
                id={fieldId("photo")}
                label="Photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hint="JPEG, PNG or WebP, up to 2 MB. Square crops look best."
              />
            ) : (
              <p className="text-sm text-amber">
                ! Photo upload needs BLOB_READ_WRITE_TOKEN.
              </p>
            )}
          </div>
          {person?.photoUrl && (
            <Checkbox label="Remove photo" name="removePhoto" />
          )}
        </ActionForm>
        {person && (
          <ActionForm
            action={deletePerson}
            submitLabel="Delete profile"
            variant="danger"
            confirmLabel="Confirm delete"
          >
            <input type="hidden" name="personId" value={person.id} />
          </ActionForm>
        )}
      </div>
    </div>
  );
}
