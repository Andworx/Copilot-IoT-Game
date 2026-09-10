import React, { useCallback, useEffect, useState } from "react";
import {
    Body1,
    Button,
    Card,
    CardHeader,
    Combobox,
    Field,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Option,
    SpinButton,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableCellLayout,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text,
    Title2,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { AddRegular, ArrowResetRegular, GiftRegular } from "@fluentui/react-icons";
import type { GeneratedComponentProps, ReadableTableRow, andy_prizetypes } from "./RuntimeTypes";

// Module-level key aliases — VALUES live on `window` (single source of truth) so
// they survive the host double-mount on open and stay coherent across module
// re-evaluation. See references/data-caching.md.
const CACHE_KEY = "__ppBulkAddPrizes_prizeTypesCache";
const INFLIGHT_KEY = "__ppBulkAddPrizes_prizeTypesInflight";
const winAny = window as unknown as Record<string, unknown>;

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;

interface CreatedPrize {
    id: string;
    name: string;
    prizeTypeName: string;
    createdAt: string;
}

interface FormErrors {
    prizeType?: string;
    quantity?: string;
}

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXL,
        padding: tokens.spacingHorizontalM,
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        overflowY: "auto",
        position: "relative",
        contain: "layout",
        "@media (max-width: 768px)": { padding: tokens.spacingHorizontalS, gap: tokens.spacingVerticalL },
    },
    headerRow: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    headerIcon: {
        color: tokens.colorBrandForeground1,
        fontSize: "28px",
    },
    formCard: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
        padding: tokens.spacingHorizontalL,
        "@media (max-width: 480px)": { padding: tokens.spacingHorizontalM },
    },
    fieldsGrid: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: tokens.spacingHorizontalL,
        width: "100%",
        "@media (max-width: 600px)": { gridTemplateColumns: "1fr", gap: tokens.spacingVerticalM },
    },
    buttonRow: {
        display: "flex",
        gap: tokens.spacingHorizontalM,
        justifyContent: "flex-end",
        alignItems: "center",
        marginTop: tokens.spacingVerticalS,
        "@media (max-width: 480px)": { flexDirection: "column-reverse", alignItems: "stretch" },
    },
    resultsCard: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalM,
        padding: tokens.spacingHorizontalL,
    },
    tableScroll: {
        maxHeight: "320px",
        overflowY: "auto",
    },
    nameCell: {
        overflow: "hidden",
        minWidth: 0,
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    loadingRow: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
});

const GeneratedComponent = ({ dataApi }: GeneratedComponentProps) => {
    const styles = useStyles();
    const dataReady = !!dataApi;

    const [{ prizeTypes, ptLoading, ptError }, setPtData] = useState<{
        prizeTypes: ReadableTableRow<andy_prizetypes>[];
        ptLoading: boolean;
        ptError: string | null;
    }>(() => {
        const cached = winAny[CACHE_KEY] as ReadableTableRow<andy_prizetypes>[] | undefined;
        return { prizeTypes: cached ?? [], ptLoading: cached === undefined, ptError: null };
    });

    // Combobox listbox portals to document.body by default, which in the genpage
    // designer would escape this page's own container. Thread mountNode so the
    // listbox stays confined to the page (see rules.md > Dialogs and Overlays).
    const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
    const setContainer = useCallback((node: HTMLDivElement | null) => setMountNode(node), []);

    const [selectedPrizeTypeId, setSelectedPrizeTypeId] = useState<string>("");
    const [selectedPrizeTypeName, setSelectedPrizeTypeName] = useState<string>("");
    const [quantity, setQuantity] = useState<number>(MIN_QUANTITY);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [createdPrizes, setCreatedPrizes] = useState<CreatedPrize[]>([]);
    const [errors, setErrors] = useState<FormErrors>({});

    // Load Prize Types for the picker (de-duped against the host double-mount).
    useEffect(() => {
        if (!dataReady) return;

        const cached = winAny[CACHE_KEY] as ReadableTableRow<andy_prizetypes>[] | undefined;
        if (cached !== undefined) {
            if (prizeTypes !== cached) setPtData({ prizeTypes: cached, ptLoading: false, ptError: null });
            return;
        }
        let cancelled = false;

        let inflight = winAny[INFLIGHT_KEY] as Promise<ReadableTableRow<andy_prizetypes>[]> | undefined;
        if (!inflight) {
            inflight = dataApi
                .queryTable("andy_prizetypes", {
                    select: ["andy_prizetypesid", "andy_prizetypename"],
                    orderBy: "andy_prizetypename asc",
                    pageSize: 200,
                })
                .then((result: { rows: ReadableTableRow<andy_prizetypes>[] }) => {
                    winAny[CACHE_KEY] = result.rows;
                    return result.rows;
                })
                .finally(() => {
                    if (winAny[INFLIGHT_KEY] === inflight) delete winAny[INFLIGHT_KEY];
                });
            winAny[INFLIGHT_KEY] = inflight;
        }

        inflight
            .then((rows) => {
                if (!cancelled) setPtData({ prizeTypes: rows, ptLoading: false, ptError: null });
            })
            .catch((err: unknown) => {
                console.error("Failed to load prize types", err);
                if (!cancelled) setPtData({ prizeTypes: [], ptLoading: false, ptError: "Unable to load prize types. Please try again." });
            });

        return () => {
            cancelled = true;
        };
        // Readiness only — never `dataApi` (a new ref every render). See Rule 15.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataReady]);

    const handlePrizeTypeSelect = useCallback(
        (_: unknown, data: { optionValue?: string; optionText?: string }) => {
            setSelectedPrizeTypeId(data.optionValue ?? "");
            setSelectedPrizeTypeName(data.optionText ?? "");
            setErrors((prev) => ({ ...prev, prizeType: undefined }));
            setMessage(null);
        },
        [],
    );

    const handleQuantityChange = useCallback((_: unknown, data: { value?: number | null; displayValue?: string }) => {
        let next: number | null = null;
        if (typeof data.value === "number" && Number.isFinite(data.value)) {
            next = data.value;
        } else if (data.displayValue) {
            const parsed = parseInt(data.displayValue, 10);
            if (!Number.isNaN(parsed)) next = parsed;
        }
        if (next !== null) {
            setQuantity(next);
            setErrors((prev) => ({ ...prev, quantity: undefined }));
            setMessage(null);
        }
    }, []);

    const resetForm = useCallback(() => {
        setSelectedPrizeTypeId("");
        setSelectedPrizeTypeName("");
        setQuantity(MIN_QUANTITY);
        setErrors({});
        setMessage(null);
    }, []);

    const handleSubmit = async () => {
        const newErrors: FormErrors = {};
        if (!selectedPrizeTypeId) newErrors.prizeType = "Select a prize type.";
        if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY) {
            newErrors.quantity = `Enter a whole number of at least ${MIN_QUANTITY}.`;
        } else if (quantity > MAX_QUANTITY) {
            newErrors.quantity = `Enter ${MAX_QUANTITY} or fewer at a time.`;
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setMessage({ type: "error", text: "Please fix the highlighted fields before creating prizes." });
            return;
        }

        setErrors({});
        setIsSubmitting(true);
        setMessage(null);

        const created: CreatedPrize[] = [];
        const createdAt = new Date().toLocaleString();
        const infoNote = `Bulk added on ${createdAt} via Bulk Add Prizes page`;

        try {
            for (let i = 1; i <= quantity; i++) {
                const prizeName = quantity > 1 ? `${selectedPrizeTypeName} #${i}` : selectedPrizeTypeName;
                const newId = await dataApi.createRow("andy_prizes", {
                    andy_prizename: prizeName,
                    andy_prizeinfo: infoNote,
                    andy_prizetaken: 0,
                    _andy_prizetype_value: `/andy_prizetypes(${selectedPrizeTypeId})`,
                });
                created.push({ id: newId, name: prizeName, prizeTypeName: selectedPrizeTypeName, createdAt });
            }
            setCreatedPrizes((prev) => [...created, ...prev]);
            setMessage({
                type: "success",
                text: `Created ${quantity} ${quantity === 1 ? "prize" : "prizes"} of type "${selectedPrizeTypeName}".`,
            });
            setQuantity(MIN_QUANTITY);
        } catch (err) {
            console.error("Failed to create prizes", err);
            if (created.length > 0) setCreatedPrizes((prev) => [...created, ...prev]);
            setMessage({
                type: "error",
                text:
                    created.length > 0
                        ? `Created ${created.length} of ${quantity} prizes before an error occurred. Please try again for the remainder.`
                        : "Unable to create prizes. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.root} ref={setContainer}>
            <div className={styles.headerRow}>
                <GiftRegular className={styles.headerIcon} aria-hidden="true" />
                <div>
                    <Title2 as="h1" block>
                        Bulk add prizes
                    </Title2>
                    <Body1 block>Pick a prize type and quantity to quickly create many prizes at once.</Body1>
                </div>
            </div>

            <Card className={styles.formCard} aria-labelledby="bulk-add-form-title">
                <CardHeader header={<Text id="bulk-add-form-title" weight="semibold">New prizes</Text>} />

                {message && (
                    <MessageBar intent={message.type === "success" ? "success" : "error"}>
                        <MessageBarBody>
                            <MessageBarTitle>{message.type === "success" ? "Success" : "Error"}</MessageBarTitle>
                            {message.text}
                        </MessageBarBody>
                    </MessageBar>
                )}

                {ptError && (
                    <MessageBar intent="error">
                        <MessageBarBody>{ptError}</MessageBarBody>
                    </MessageBar>
                )}

                <div className={styles.fieldsGrid}>
                    <Field
                        label="Prize type"
                        required
                        validationState={errors.prizeType ? "error" : "none"}
                        validationMessage={errors.prizeType}
                    >
                        <Combobox
                            placeholder={ptLoading ? "Loading prize types..." : "Select a prize type"}
                            value={selectedPrizeTypeName}
                            selectedOptions={selectedPrizeTypeId ? [selectedPrizeTypeId] : []}
                            onOptionSelect={handlePrizeTypeSelect}
                            disabled={ptLoading || isSubmitting}
                            mountNode={mountNode}
                            data-field="prizeType"
                        >
                            {prizeTypes.map((pt) => (
                                <Option key={pt.andy_prizetypesid} value={pt.andy_prizetypesid} text={pt.andy_prizetypename}>
                                    {pt.andy_prizetypename}
                                </Option>
                            ))}
                        </Combobox>
                    </Field>

                    <Field
                        label="Quantity"
                        required
                        validationState={errors.quantity ? "error" : "none"}
                        validationMessage={errors.quantity}
                    >
                        <SpinButton
                            min={MIN_QUANTITY}
                            max={MAX_QUANTITY}
                            step={1}
                            value={quantity}
                            displayValue={String(quantity)}
                            onChange={handleQuantityChange}
                            disabled={isSubmitting}
                            data-field="quantity"
                        />
                    </Field>
                </div>

                <div className={styles.buttonRow}>
                    <Button
                        appearance="secondary"
                        icon={<ArrowResetRegular />}
                        onClick={resetForm}
                        disabled={isSubmitting}
                    >
                        Reset
                    </Button>
                    <Button
                        appearance="primary"
                        icon={isSubmitting ? <Spinner size="tiny" /> : <AddRegular />}
                        onClick={handleSubmit}
                        disabled={isSubmitting || ptLoading}
                    >
                        {isSubmitting ? "Creating..." : "Create prizes"}
                    </Button>
                </div>
            </Card>

            <Card className={styles.resultsCard} aria-labelledby="created-prizes-title">
                <CardHeader
                    header={
                        <Text id="created-prizes-title" weight="semibold">
                            Created this session ({createdPrizes.length})
                        </Text>
                    }
                />
                {createdPrizes.length === 0 ? (
                    <Body1>No prizes created yet this session.</Body1>
                ) : (
                    <div className={styles.tableScroll}>
                        <Table aria-label="Prizes created this session" size="small">
                            <TableHeader>
                                <TableRow>
                                    <TableHeaderCell>Prize name</TableHeaderCell>
                                    <TableHeaderCell>Prize type</TableHeaderCell>
                                    <TableHeaderCell>Created</TableHeaderCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {createdPrizes.map((prize) => (
                                    <TableRow key={prize.id}>
                                        <TableCell>
                                            <TableCellLayout className={styles.nameCell} title={prize.name}>
                                                {prize.name}
                                            </TableCellLayout>
                                        </TableCell>
                                        <TableCell>
                                            <TableCellLayout className={styles.nameCell} title={prize.prizeTypeName}>
                                                {prize.prizeTypeName}
                                            </TableCellLayout>
                                        </TableCell>
                                        <TableCell>
                                            <TableCellLayout>{prize.createdAt}</TableCellLayout>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default GeneratedComponent;

